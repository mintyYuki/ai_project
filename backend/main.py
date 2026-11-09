from fastapi import FastAPI

app = FastAPI(title="Car Service API", version="1.0.0")

@app.get("/")
def read_root():
    return {"message": "Welcome to Car Service API"}
