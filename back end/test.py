from main import Chunk
import json
'''
Code to create and print a simple wordsearch.
set whatever seed you want to generate a wordsearch.
x, y co-ords are for infinite generation. they effect the seed thats used to generate everything.
the last row of x = n is the same as the first row of x = n+1
this is a bit hard to see as everything has to be shifted around to be usable going from array format to readable
formats. It would be smarter to write everything so it directly maps from array -> readable but I didnt so it doesnt
 matter.
'''
test_chunk = Chunk(0,0,12, 'seed')

test_chunk.word_search_generate(20, fail_state=100)


print(test_chunk.word_list)
print(test_chunk.start_end_cords)
print(test_chunk.quick_numbers_to_letters())
