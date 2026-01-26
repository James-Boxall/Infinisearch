import numpy as np
import random
from pathlib import Path
import string
import re

# Load filtered words list
PROJECT_DIR = Path(__file__).parent
path = PROJECT_DIR / "filtered_words.txt"
with open(path, "r") as f:
    word_list = f.read().splitlines()

class Chunk:
    CHUNK_SIZE = 10
    MIN_LENGTH = 3



    def __init__(self, x, y, CHUNK_SIZE, seed):
        # set the chunks x and y co-ordinate
        self.x = x
        self.y = y
        self.min_length = 3
        # Passing other parameters for generation
        self.size = CHUNK_SIZE
        # Setting seed so it is effected by chunks x, y position
        self.seed_indp = seed
        self.seed = f"{seed}:{self.x},{self.y}"
        random.seed(self.seed)
        # initialise a grid for the word search
        self.grid = np.zeros((self.size, self.size), dtype = int)
        self.border_mask, self.is_word, self.vectors, self.letters, self.weights = self.initial_params()
        # List for generated words:
        self.word_list = []
        # start and end co-ordinates of words in chunk
        self.start_end_cords = []
        # Dictionaries for converting between letters and numbers
        self.letter_to_number = {chr(i + 64): i for i in range(1, 27)}
        self.number_to_letter = {i: chr(i + 64) for i in range(1, 27)}

        self.vector_list = np.array([(0, 1), (1, 1), (1, 0), (1, -1),
                                     (0, -1), (-1, -1), (-1, 0), (-1, 1)])

    def random_from_coords(self, i, k, max_value=100):
        '''

        :param i: x coordinate of letter inside chunk
        :param k: y coordinate of letter inside chunk
        :param max_value: max value generated
        :return: random value between 1 and 26
        '''
        # Makes it so last line of one chunk is the same as first line of next chunk
        if i == 9:
            pass
        chunk_x = self.x + i/(self.size-1)
        chunk_y = self.y + k/(self.size-1)
        # Combines these values into a seed and generates a random number from it
        combined_seed = f"{self.seed_indp}:{chunk_x},{chunk_y}"
        rng = random.Random(combined_seed)
        letter = rng.randint(1, max_value)
        return letter

    def initial_params(self):

        # Identifying corner and border sections of grid. side = 1, top, bottom = 2, corner = 3.
        border_mask = np.copy(self.grid)
        border_mask[0, :] = border_mask[-1, :] = 1
        border_mask[:, 0] = border_mask[:, -1] = 2
        border_mask[0, 0] = border_mask[0, -1] = 3
        border_mask[-1, 0] = border_mask[-1, -1] = 3

        # To check if a specific point is part of a word. Starts as all Zeros
        is_word = np.copy(self.grid)

        # 3D Grid of allowed vectors for each point.
        vectors = np.ones((self.size, self.size, 8), dtype=bool)


        # populating grid with random letters based on x and y co-ordinates.
        letters = np.copy(self.grid)
        for col_index, _i in enumerate(letters):
            for row_index, _k in enumerate(letters):
                letters[col_index, row_index] = self.random_from_coords(col_index, row_index, max_value = 26)


        weights = np.random.randint(1, 10, size=(self.size, self.size))

        return border_mask, is_word, vectors, letters, weights

    def check_along_word(self,i, k,  vector_index, word):
        # checks along word to see if the same vector or its opposite is already present
        Check = True
        index_2 = (vector_index + 4) % 8
        _vector = self.vector_list[vector_index]
        for j, __ in enumerate(word):
            point = self.vectors[i+j*int(_vector[0]), k+j*int(_vector[1])]
            if point == vector_index or point == index_2:
                Check = False
                break
        return Check


    def vector_set(self, i, k, length):
        # Checking if a corner point
        if self.border_mask[i, k] == 3 and self.is_word[i,k] == 0:
            self.vectors[i, k] = False
            if i == 0 and k == 0:
                self.vectors[i, k, 1] = True
            elif i == 0 and k == self.size - 1:
                self.vectors[i, k, 3] = True
            elif i == self.size - 1 and k == 0:
                self.vectors[i, k, 7] = True
            elif i == self.size - 1 and k == self.size - 1:
                self.vectors[i, k, 5] = True
            return True
        elif self.border_mask[i, k] == 3:
            return False
        else:
            # List of vectors to run through.
            mask_init = self.vectors[i,k]

            # Running through available vectors and testing if they fall within a chunk
            for _index, _v in enumerate(self.vector_list):
                end_pos = np.array([i, k]) + length * _v
                _test = (0 <= end_pos) & (end_pos <= self.size - 1)
                if np.all(_test):
                    pass
                else:
                    self.vectors[i, k, _index] = False

                if self.vectors[i, k, _index]:
                    for x in range(1, length):
                        new_index = np.array([i, k]) + x * _v
                        if self.border_mask[i, k] == self.border_mask[new_index[0], new_index[1]]:
                            self.vectors[i, k, _index] = False
                            break
                        if self.vectors[new_index[0], new_index[1], _index] == False:
                            self.vectors[i, k, _index] = False
                            break


            if np.any(self.vectors[i, k]):
                return True
            else:
                return False

    def add_word(self,i, k, word, _vector_index):
        '''

        :param i: i coordinate to start/end word at
        :param k: k coordinaate to start search at
        :param word:
        :param _vector_index:
        :return:
        '''

        _vector = self.vector_list[_vector_index]
        # Check vector direction to see if it is start or end of word.
        if  _vector_index < 1 or _vector_index > 5:
             word = word[::-1]

        for pos, l in enumerate(word.upper()):
            new_i = i + pos*_vector[0]
            new_k = k + pos*_vector[1]

            input = self.letter_to_number[l]
            self.letters[new_i, new_k] = input
            self.is_word[new_i, new_k] = 1
            self.vectors[new_i, new_k, _vector_index] = False
            self.vectors[new_i, new_k, (_vector_index +4) % 8] = False

    def key_create(self, i, k):
        '''
        :param i: i coordinate at start of key
        :param k: k coordinate at start of key
        :return: full key with '.' for blanks. usable for regex search. returns False if no usable key found
        '''
        length = random.randrange(self.min_length, self.size-1)
        if self.vector_set(i, k, length):
            # Choose a random vector

            _allowed_vectors = np.flatnonzero(self.vectors[i, k])
            _vector_index = int(random.choice(_allowed_vectors))
            _vector = self.vector_list[_vector_index]
            # Create Key through checking along vector for borders or already placed words.
            key = ''
            for v in range(0, length):
                x, y = np.array([i,k]) + _vector*v
                if self.is_word[x, y] == 1 or self.border_mask[x, y] != 0:
                    letter_n = self.letters[x, y]
                    letter = self.number_to_letter[letter_n]
                    key += letter
                else:
                    key += '.'
            if  _vector_index < 1 or _vector_index > 5:
                 key = key[::-1]
            return key, _vector_index

        else:
            return False

    def pattern_match(self, key):
        # Uses created key to search for a word in the filtered words file.
        regex_pattern = '^' + key + '$'
        regex = re.compile(regex_pattern, re.IGNORECASE)
        return [_word for _word in word_list if regex.match(_word)]

    def word_search_generate(self, words_wanted, fail_state = 100):
        '''

        :param words_wanted: number of words desired in word search
        :param fail_state: now many failures before breaking the word_adding loop
        :return: list of words added to the search
        '''
        words_added = 0
        fail = 0
        full_list = []
        start_end_cords = []

        while words_added <= words_wanted and fail <= fail_state:
            i = random.randint(0, self.size - 1)
            k = random.randint(0, self.size - 1)
            key_vec = self.key_create(i, k)

            if key_vec:
                key, vector_index = key_vec
                _word_list = self.pattern_match(key)
                if _word_list:
                    word = random.choice(_word_list)
                    self.add_word(i, k, word, vector_index)
                    start_pos = (i, k)
                    _vector = self.vector_list[vector_index]
                    end_pos = (i + (len(word)-1)*_vector[0], k + (len(word)-1)*_vector[1])
                    start_end_cords.append((start_pos, end_pos))

                    words_added += 1
                    full_list.append(word)
                else:
                    fail += 1
            else:
                fail += 1

        self.word_list = full_list
        self.start_end_cords = start_end_cords



    def quick_numbers_to_letters(self):
        # Quick method to print a usable word search.
        char_array = np.vectorize(lambda x: chr(x - 1 + ord('A')))(np.array(np.flip(self.letters, axis = 1), dtype= int))
        return char_array




