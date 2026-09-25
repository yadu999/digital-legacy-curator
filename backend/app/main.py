from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.processors.file_processor import DataProcessor
from app.curator.curator import LegacyCurator
from app.models.auth import AuthHandler, USER_DB, User, Token
import shutil
import os
import requests
from bs4 import BeautifulSoup
from typing import List

app = FastAPI(title="Digital Legacy Curator API")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = DataProcessor()
curator = LegacyCurator()

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = AuthHandler.decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload.get("sub")

@app.post("/register")
async def register(user: User):
    print(f"Registration attempt for user: {user.username}")
    if not user.username or not user.password:
        print("Registration failed: missing credentials")
        raise HTTPException(status_code=400, detail="Username and password are required")
    if user.username in USER_DB:
        print(f"Registration failed: {user.username} already exists")
        raise HTTPException(status_code=400, detail="Username already exists")
    USER_DB[user.username] = AuthHandler.get_password_hash(user.password)
    print(f"User {user.username} registered successfully")
    return {"message": "User registered successfully"}

@app.post("/token")
async def login(user: User):
    print(f"Login attempt for user: {user.username}")
    username = user.username
    password = user.password
    
    if not username or not password:
        print("Login failed: missing credentials")
        raise HTTPException(status_code=400, detail="Username and password are required")
        
    hashed_pw = USER_DB.get(username)
    if not hashed_pw:
        print(f"Login failed: user {username} not found")
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    if not AuthHandler.verify_password(password, hashed_pw):
        print(f"Login failed: incorrect password for {username}")
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    print(f"User {username} logged in successfully")
    access_token = AuthHandler.create_access_token(data={"sub": username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/list-files")
async def list_files(user: str = Depends(get_current_user)):
    try:
        user_data_dir = os.path.join(DATA_DIR, user)
        if not os.path.exists(user_data_dir):
            return {"files": []}
        files = os.listdir(user_data_dir)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...), user: str = Depends(get_current_user)):
    user_data_dir = os.path.join(DATA_DIR, user)
    os.makedirs(user_data_dir, exist_ok=True)
    
    uploaded_files = []
    for file in files:
        file_path = os.path.join(user_data_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_files.append(file.filename)
    
    processed_data = processor.process_directory(user_data_dir)
    curator.ingest_to_vector_db(processed_data)
    
    return {"message": f"Successfully indexed {len(uploaded_files)} files for {user}", "files": uploaded_files}

@app.post("/ingest-url")
async def ingest_url(url: str = Query(...), user: str = Depends(get_current_user)):
    try:
        user_data_dir = os.path.join(DATA_DIR, user)
        os.makedirs(user_data_dir, exist_ok=True)
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        for script in soup(["script", "style"]): script.extract()
        text = soup.get_text(separator=' ')
        
        filename = f"web_{hash(url)}.txt"
        file_path = os.path.join(user_data_dir, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(text)
            
        processed_data = processor.process_directory(user_data_dir)
        curator.ingest_to_vector_db(processed_data)
        
        return {"message": f"Successfully ingested {url} for {user}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/curate")
async def curate_legacy(tone: str = Query("poignant"), user: str = Depends(get_current_user)):
    try:
        user_data_dir = os.path.join(DATA_DIR, user)
        processed_data = processor.process_directory(user_data_dir)
        if not processed_data:
            raise HTTPException(status_code=400, detail="No data found to curate.")
        
        narrative = curator.generate_narrative(processed_data, tone=tone)
        return {"narrative": narrative}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lifemap")
async def get_lifemap(user: str = Depends(get_current_user)):
    try:
        user_data_dir = os.path.join(DATA_DIR, user)
        processed_data = processor.process_directory(user_data_dir)
        entities = curator.extract_entities(processed_data)
        return {"entities": entities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ask")
async def ask_legacy(question: str = Query(...), user: str = Depends(get_current_user)):
    try:
        user_data_dir = os.path.join(DATA_DIR, user)
        processed_data = processor.process_directory(user_data_dir)
        answer = curator.ask_legacy(question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
