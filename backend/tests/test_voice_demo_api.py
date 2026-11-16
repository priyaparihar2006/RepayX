from fastapi.testclient import TestClient
from api.main import create_app

def test_voice_demo_endpoints():
    app = create_app()
    client = TestClient(app)

    # 1. GET default Hindi demo audio
    r_hi = client.get("/api/voice/demo-audio?language=hindi")
    assert r_hi.status_code == 200, r_hi.text
    data_hi = r_hi.json()
    assert data_hi["success"] is True
    assert "audio_url" in data_hi
    assert data_hi["language"] == "hindi"
    assert "नमस्ते" in data_hi["script"]

    # 2. Check that the audio file can be downloaded by browser
    audio_res = client.get(data_hi["audio_url"])
    assert audio_res.status_code == 200
    assert audio_res.headers["content-type"] in ("audio/mpeg", "audio/ogg")
    assert len(audio_res.content) > 1000

    # 3. GET default English demo audio
    r_en = client.get("/api/voice/demo-audio?language=english")
    assert r_en.status_code == 200
    data_en = r_en.json()
    assert data_en["success"] is True
    assert "audio_url" in data_en
    assert data_en["language"] == "english"
    assert "Rahul" in data_en["script"]

    # 4. Check cache hit on second call
    r_hi_cached = client.get("/api/voice/demo-audio?language=hindi")
    assert r_hi_cached.status_code == 200
    assert r_hi_cached.json()["cached"] is True

    # 5. POST custom synthesis
    r_post = client.post("/api/voice/synthesize", json={
        "text": "Hello, this is a custom RepayX voice synthesis test.",
        "language": "english"
    })
    assert r_post.status_code == 200
    data_post = r_post.json()
    assert data_post["success"] is True
    assert "audio_url" in data_post
