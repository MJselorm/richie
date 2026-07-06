import os
from dotenv import load_dotenv
from supabase import create_client
from supabase.lib.client_options import SyncClientOptions

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY") or SERVICE_KEY

supabase = create_client(SUPABASE_URL, SERVICE_KEY)


def create_authenticated_client(access_token: str):
    options = SyncClientOptions(
        headers={
            "Authorization": f"Bearer {access_token}",
        }
    )
    return create_client(SUPABASE_URL, ANON_KEY, options)
