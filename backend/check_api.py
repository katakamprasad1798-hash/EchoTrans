from youtube_transcript_api import YouTubeTranscriptApi
print(f"get_transcript: {'get_transcript' in dir(YouTubeTranscriptApi)}")
print(f"list_transcripts: {'list_transcripts' in dir(YouTubeTranscriptApi)}")
print(f"list: {'list' in dir(YouTubeTranscriptApi)}")
try:
    api = YouTubeTranscriptApi()
    print(f"Instance list: {'list' in dir(api)}")
except Exception as e:
    print(f"Instance error: {e}")
