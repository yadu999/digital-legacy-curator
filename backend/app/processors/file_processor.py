import PyPDF2
import os
from typing import List, Dict

class DataProcessor:
    def __init__(self):
        pass

    def extract_text_from_pdf(self, file_path: str) -> str:
        text = ""
        try:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error reading PDF {file_path}: {e}")
        return text

    def extract_text_from_txt(self, file_path: str) -> str:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Error reading TXT {file_path}: {e}")
            return ""

    def process_directory(self, directory_path: str) -> List[Dict]:
        processed_data = []
        for filename in os.listdir(directory_path):
            path = os.path.join(directory_path, filename)
            if filename.endswith(".pdf"):
                content = self.extract_text_from_pdf(path)
                processed_data.append({"source": filename, "content": content, "type": "pdf"})
            elif filename.endswith(".txt"):
                content = self.extract_text_from_txt(path)
                processed_data.append({"source": filename, "content": content, "type": "text"})
        return processed_data
