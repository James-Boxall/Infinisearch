from flask import Flask, jsonify,  request
from flask_cors import CORS
from main import Chunk



app = Flask(__name__)
CORS(app)


@app.route('/api/data')
def get_data():
    # Get parameters from query string
    seed = request.args.get('seed', 'seed')  # default to 'seed'
    x = int(request.args.get('chunkX', 0))
    y = int(request.args.get('chunkY', 0))
    # IMPORTANT: EVERY CHUNK IS MIRRORED AND FLIPPED DUE TO THE WAY COORDS ARE HANDLED INTERNALLY AND GOING FROM THAT -> READABLE ORIENTATION. I WILL FIX THIS LATER
    temp = x
    x = -1*y
    y = -1*temp

    size = 12  # Fixed size
    word_count = int(request.args.get('word_count', 20))
    
    generated_chunk = Chunk(x, y, size, seed)
    generated_chunk.word_search_generate(word_count)
    
    # Placing results into a dictionary to jsonify
    result = {
        "letters": generated_chunk.quick_numbers_to_letters().tolist(), 
        "words": [
            {
                "word": word,
                "start": {"row": int(start[1]), "col": int(start[0])},
                "end": {"row": int(end[1]), "col": int(end[0])}
            }
            for word, (start, end) in zip(generated_chunk.word_list, generated_chunk.start_end_cords)
        ]
    }
    #REVERSED VERSION UNTIL CO-ORD ISSUE IS FIXED
    result_rev = {
        "letters": generated_chunk.quick_numbers_to_letters().tolist(), 
        "words": [
            {
                "word": word,
                "start": {"row": int(start[0]), "col": int(size-start[1]-1)},
                "end": {"row": int(end[0]), "col": int(size-end[1]-1)}
            }
            for word, (start, end) in zip(generated_chunk.word_list, generated_chunk.start_end_cords)
        ]
    }
    return jsonify(result_rev)

if __name__ == '__main__':
    app.run(port=5000)