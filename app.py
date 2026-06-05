from flask import Flask, render_template, request
from textblob import TextBlob
import json
import random

app = Flask(__name__)

with open('data/songs.json', 'r') as file:
    songs = json.load(file)

quotes = {
    "happy": [
        "Keep smiling, life is beautiful!",
        "Happiness looks good on you!",
        "Joy is not in things; it is in us."
    ],
    "sad": [
        "Every storm passes eventually.",
        "You are stronger than you think.",
        "It's okay to not be okay. Healing takes time."
    ],
    "motivated": [
        "Push yourself because no one else will.",
        "Dream big and dare to fail.",
        "Your only limit is you."
    ],
    "calm": [
        "Quiet the mind and the soul will speak.",
        "Peace starts within your own breath.",
        "Slow down and enjoy the present moment."
    ],
    "energetic": [
        "Bring your fire, make your mark!",
        "Unleash your power and dance to your own beat.",
        "Action is the foundational key to all success."
    ]
}


def detect_mood(text):
    text_lower = text.lower()
    
    # Strong keyword checks for high-precision overrides
    calm_words = ["calm", "relax", "peace", "chill", "sleep", "quiet", "sooth", "rest", "serene", "meditat"]
    energetic_words = ["excited", "energy", "hype", "dance", "party", "wild", "thrill", "pumped", "electro"]
    motivated_words = ["motivated", "focus", "work", "goal", "strong", "power", "achieve", "success", "push", "drive", "hustle"]
    happy_words = ["happy", "joy", "smile", "great", "awesome", "wonderful", "glad", "celebrate", "cheerful"]
    sad_words = ["sad", "lonely", "depressed", "cry", "hurt", "pain", "broken", "grief", "gloomy", "blue"]

    scores = {
        "calm": sum(1 for w in calm_words if w in text_lower),
        "energetic": sum(1 for w in energetic_words if w in text_lower),
        "motivated": sum(1 for w in motivated_words if w in text_lower),
        "happy": sum(1 for w in happy_words if w in text_lower),
        "sad": sum(1 for w in sad_words if w in text_lower)
    }
    
    max_score = max(scores.values())
    if max_score > 0:
        winners = [k for k, v in scores.items() if v == max_score]
        if len(winners) == 1:
            return winners[0]

    # Fallback to TextBlob sentiment analysis
    analysis = TextBlob(text)
    polarity = analysis.sentiment.polarity
    subjectivity = analysis.sentiment.subjectivity

    if polarity < -0.15:
        return "sad"
    elif polarity > 0.4:
        return "happy"
    elif 0.1 <= polarity <= 0.4:
        if subjectivity > 0.5:
            return "energetic"
        else:
            return "happy"
    else:  # -0.15 <= polarity < 0.1
        if subjectivity < 0.35:
            return "calm"
        else:
            return "motivated"


@app.route('/', methods=['GET', 'POST'])
def home():
    mood = None
    recommended_songs = []
    quote = ""

    if request.method == 'POST':
        user_text = request.form['mood_text']
        mood = detect_mood(user_text)
        recommended_songs = songs.get(mood, [])
        quote = random.choice(quotes.get(mood, ["Keep listening!"]))

    return render_template(
        'index.html',
        mood=mood,
        songs=recommended_songs,
        quote=quote
    )


if __name__ == '__main__':
    app.run(debug=True)