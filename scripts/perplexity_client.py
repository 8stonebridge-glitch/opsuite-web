import os
from perplexityai import Perplexity

client = Perplexity(api_key=os.environ.get("PERPLEXITY_API_KEY"))
