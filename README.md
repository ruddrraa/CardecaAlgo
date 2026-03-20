# 🚗 Car Identification and Object Detection (RT-DETR)

A research-driven platform for **advanced vehicle detection and fine-grained classification** using state-of-the-art Deep Learning models.

This system combines **RT-DETR (for detection)** and a **custom PyTorch classifier (EfficientNet)** to deliver high-performance inference on uploaded images. The backend processes images efficiently, while the frontend provides a seamless, interactive experience.

---

## 👨‍💻 Authors

- **Ideator & Author**: Sourajit Maity  
- **Co-author**: Sohan Das  
- **Co-author**: Rudra Pratap Singh  

---

## 🏗️ Architecture & Tech Stack

### 🎨 Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS v4, Framer Motion
- **State Management**: Zustand
- **Graphics / Export**: Konva, jsPDF

---

### ⚙️ Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Atlas / Local using Motor or PyMongo)
- **Machine Learning**:
  - PyTorch & TorchVision
  - Ultralytics RT-DETR
  - Custom trained models:
    - `rtdetr_weights.pt`
    - `car_model_weights.pth`

---

## 🚀 Getting Started

Follow the steps below to set up both backend and frontend locally.

---

### 🔹 1. Backend Setup (FastAPI + AI Models)

#### 📌 Prerequisites
- Python 3.9+
- MongoDB (Local or Atlas)

#### 📦 Installation

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
 ```
 ## Backend & Frontend Run Command 

 ```bash
 #Backend 
 uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
 #Frontend:
cd Folder
npm install
npm run dev 
