print('Script started')
import sys
sys.path.append('.')
print('Path added')
import os
print('GROQ_API_KEY loaded:', bool(os.getenv('GROQ_API_KEY')))
from dotenv import load_dotenv
load_dotenv()
print('After load_dotenv:', bool(os.getenv('GROQ_API_KEY')))
try:
    from app.services.llm_service import call_llm_for_risk
    print('Import successful')
    print('Calling LLM...')
    result = call_llm_for_risk('Test risk', 'Projet/Programme', 'Technique', 'IT')
    print('LLM result:', result)
except Exception as e:
    print('Error:', e)
print('Script finished')
