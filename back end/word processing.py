# File for scrubbing out unusable words from a list


with open("20k.txt", "r") as f:
    words = f.read().splitlines()


filtered_words = [word for word in words if len(word) >= 3]

# Save filtered words to a new file
with open("filtered_words.txt", "w") as f:
    f.write("\n".join(filtered_words))