import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "http://localhost:8000/exam/topics/",
            headers={"Authorization": "Bearer examSECRET"}
        )
        print(f"Status: {resp.status_code}")
        print(resp.text[:3000])

asyncio.run(main())
