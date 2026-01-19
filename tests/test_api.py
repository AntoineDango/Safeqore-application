import json
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

pytestmark = pytest.mark.asyncio


async def test_health_and_constants():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

        c = await ac.get("/constants")
        assert c.status_code == 200
        data = c.json()
        assert "categories" in data and isinstance(data["categories"], list)
        assert "types" in data and isinstance(data["types"], list)
        assert data["classifications"] == ["Faible", "Modéré", "Élevé"]


async def test_ia_compliance():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/ia/compliance")
        assert r.status_code == 200
        d = r.json()
        assert "methodology" in d
        assert d["methodology"]["classification"]["Modéré"] == "26-50"


async def test_questionnaire_flow_and_report():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Load constants to pick valid values
        c = await ac.get("/constants")
        assert c.status_code == 200
        const = c.json()
        category = const["categories"][0]
        rtype = const["types"][0]
        sector = (const.get("sectors") or [""])[0]

        # Get questions
        qq = await ac.get("/questionnaire/questions", params={"sector": sector})
        assert qq.status_code == 200
        qd = qq.json()
        questions = qd.get("questions", [])
        assert len(questions) > 0

        # Build naive answers: pick first option for each question
        answers = []
        for q in questions:
            opts = q.get("reponses_possibles", [])
            if not opts:
                continue
            answers.append({"question_id": q["id"], "option_id": opts[0]["id"]})

        # Analyze
        payload = {
            "description": "Test risque demo",
            "category": category,
            "type": rtype,
            "sector": sector,
            "answers": answers,
        }
        a = await ac.post("/questionnaire/analyze", json=payload)
        assert a.status_code == 200
        res = a.json()
        assert all(k in res for k in ["id", "G", "F", "P", "score", "classification", "normalized_score_100"])  # basic fields

        # Export
        ex = await ac.get("/questionnaire/export")
        assert ex.status_code == 200
        assert ex.headers.get("content-type", "").startswith("application/json")
        exported = json.loads(ex.text)
        assert isinstance(exported, list)

        # Import the same (should be 0 new)
        im = await ac.post("/questionnaire/import", json={"items": exported})
        assert im.status_code == 200
        imd = im.json()
        assert imd["status"] == "ok"

        # Report docx
        rep = await ac.get(f"/questionnaire/report/{res['id']}")
        assert rep.status_code == 200
        assert rep.headers.get("content-type", "").startswith("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
