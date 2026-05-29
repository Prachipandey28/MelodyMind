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
        "Happiness looks good on you!"
    ],
    "sad": [
        "Every storm passes eventually.",
        "You are stronger than you think."
    ],
    "motivated": [
        "Push yourself because no one else will.",
        "Dream big and dare to fail."
    ]
}


def detect_mood(text):
    analysis = TextBlob(text)
    polarity = analysis.sentiment.polarity

    if polarity > 0.3:
        return "happy"
    elif polarity < -0.2:
        return "sad"
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

        recommended_songs = songs[mood]
        quote = random.choice(quotes[mood])

    return render_template(
        'index.html',
        mood=mood,
        songs=recommended_songs,
        quote=quote
    )


if __name__ == '__main__':
    app.run(debug=True)