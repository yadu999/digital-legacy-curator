import os
import requests
from dotenv import load_dotenv
import chromadb
from chromadb.utils import embedding_functions

load_dotenv()

class LegacyCurator:
    def __init__(self):
        self.ollama_url = "http://localhost:11434/api/generate"
        self.ollama_embed_url = "http://localhost:11434/api/embeddings"
        self.model = "llama3"
        
        self.chroma_client = chromadb.PersistentClient(path="data/chroma_db")
        self.collection = self.chroma_client.get_or_create_collection(name="legacy_footprints")

    def _call_ollama(self, system_prompt, user_content):
        payload = {
            "model": self.model,
            "prompt": f"{system_prompt}\n\n{user_content}",
            "stream": False
        }
        try:
            response = requests.post(self.ollama_url, json=payload)
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            print(f"Ollama Error: {e}")
            return f"Error generating content: {str(e)}"

    def ingest_to_vector_db(self, processed_data: list):
        for i, item in enumerate(processed_data):
            self.collection.add(
                documents=[item['content']],
                metadatas=[{"source": item['source'], "type": item['type']}],
                ids=[f"doc_{i}"]
            )

    def generate_narrative(self, user_data: list, tone: str = "poignant") -> str:
        context = "\n\n".join([f"Source: {item['source']}\nContent: {item['content']}" for item in user_data])
        tone_guides = {
            "poignant": "Use emotional, heartfelt, and poetic language. Focus on legacy, love, and the human spirit.",
            "professional": "Use formal, structured, and objective language. Focus on achievements, titles, and chronological milestones.",
            "humorous": "Use a witty, light-hearted, and slightly sarcastic tone. Focus on the quirks and funny mishaps of life."
        }
        selected_tone = tone_guides.get(tone, tone_guides["poignant"])
        system_prompt = (
            f"You are a Digital Legacy Curator. {selected_tone} "
            "Analyze the following footprints and synthesize a life narrative. "
            "You MUST respond ONLY with a raw JSON array. No introductory text, no markdown blocks, no explanation. "
            "The JSON must be a list of objects. "
            "Each object must have: 'year', 'title', and 'description'. "
            "Sort them chronologically."
        )
        
        raw_response = self._call_ollama(system_prompt, f"Digital Footprint Data:\n{context}")
        
        try:
            start = raw_response.find('[')
            end = raw_response.rfind(']') + 1
            if start != -1 and end != 0:
                return raw_response[start:end]
        except Exception:
            pass
            
        return raw_response

    def extract_entities(self, user_data: list):
        """Extracts people and places to build a Life Map"""
        if not user_data:
            return []
        context = "\n\n".join([item['content'] for item in user_data])
        system_prompt = (
            "Analyze the text and extract a list of key people, places, and organizations. "
            "You MUST respond ONLY with a raw JSON array. No introductory text, no markdown blocks. "
            "Format: [{'entity': 'Name', 'type': 'Person/Place/Org', 'connection': 'Relationship to user'}]"
        )
        raw_response = self._call_ollama(system_prompt, context)
        try:
            import json
            start = raw_response.find('[')
            end = raw_response.rfind(']') + 1
            if start != -1 and end != 0:
                return json.loads(raw_response[start:end])
            return json.loads(raw_response)
        except Exception as e:
            print(f"Entity Extraction Error: {e}")
            return []

    def ask_legacy(self, question: str) -> str:
        results = self.collection.query(query_texts=[question], n_results=3)
        context = "\n\n".join(results['documents'][0])
        system_prompt = "You are the voice of the Digital Legacy. Answer based ONLY on the context. If unknown, say you don't know."
        return self._call_ollama(system_prompt, f"Context:\n{context}\n\nQuestion: {question}")

    def summarize_event(self, event_text: str) -> str:
        system_prompt = "Summarize this life event into a concise, poignant timeline entry."
        return self._call_ollama(system_prompt, event_text)
