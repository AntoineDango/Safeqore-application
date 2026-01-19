import os
import joblib
import numpy as np

MODEL_PATH = os.getenv("ML_MODEL_PATH", "risk_classifier.pkl")
ENCODERS_PATH = os.getenv("ENCODERS_PATH", "encoders.pkl")
CLASS_ENCODER_PATH = os.getenv("CLASS_ENCODER_PATH", "classification_encoder.pkl")

_model = None
_encoders = None
_class_encoder = None

def load_model():
    global _model, _encoders, _class_encoder
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    if _encoders is None:
        if os.path.exists(ENCODERS_PATH):
            _encoders = joblib.load(ENCODERS_PATH)
        else:
            _encoders = {}
    if _class_encoder is None:
        if os.path.exists(CLASS_ENCODER_PATH):
            _class_encoder = joblib.load(CLASS_ENCODER_PATH)
        else:
            _class_encoder = None
    return _model, _encoders, _class_encoder

def predict_classification(G:int, F:int, P:int, category:str, typ:str):
    model, encoders, class_enc = load_model()
    # Encodage safe
    try:
        cat_enc = encoders["category"].transform([category])[0] if "category" in encoders else 0
    except Exception:
        cat_enc = 0
    try:
        type_enc = encoders["type"].transform([typ])[0] if "type" in encoders else 0
    except Exception:
        type_enc = 0

    X = np.array([[int(G), int(F), int(P), int(cat_enc), int(type_enc)]])
    y_pred = model.predict(X)[0]
    try:
        decoded = class_enc.inverse_transform([y_pred])[0] if class_enc is not None else int(y_pred)
    except Exception:
        decoded = int(y_pred)
    return {
        "ml_classification": decoded,
        "ml_raw": int(y_pred)
    }
