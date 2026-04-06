import httpx
import asyncio
import os

async def main():
    url = os.environ.get("NANOBOT_EXAM_BACKEND_URL", "http://localhost:42002")
    api_key = os.environ.get("NANOBOT_EXAM_API_KEY", "examSECRET")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{url}/exam/topics/",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        resp.raise_for_status()
        print(f"Status: {resp.status_code}")
        print(f"Content: {resp.text[:500]}")
        topics = resp.json()
        for t in topics:
            print(f"  [{t['id']}] {t['slug']}: {t['title']}")
            print(f"      {t['description']}")
            print()

asyncio.run(main())
