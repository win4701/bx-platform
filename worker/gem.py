def safe_get(endpoint, params=None):
    return requests.get(
        f"{API_BASE_URL}{endpoint}",
        params=params,
        headers={"X-API-Key": os.getenv("API_KEY")},
        timeout=10
    )
