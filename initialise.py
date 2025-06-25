import pygame
import numpy as np
import string
from main import Chunk
# Initialize pygame
pygame.init()

# Parameters
CELL_SIZE = 40
FONT_SIZE = 30
MARGIN = 5
FONT_COLOR = (0, 0, 0)
BG_COLOR = (255, 255, 255)

# Create a random numpy grid (or you can pass your own)
rows, cols = 10, 10
grid = Chunk

# Convert numbers to letters (1=A, ..., 26=Z)
def num_to_letter(n):
    return string.ascii_uppercase[n - 1]

letter_grid = np.vectorize(num_to_letter)(grid)

# Set up display
screen_width = cols * (CELL_SIZE + MARGIN) + MARGIN
screen_height = rows * (CELL_SIZE + MARGIN) + MARGIN
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption("Letter Grid")

# Load font
font = pygame.font.SysFont(None, FONT_SIZE)

# Main loop
running = True
while running:
    screen.fill(BG_COLOR)

    for y in range(rows):
        for x in range(cols):
            rect_x = x * (CELL_SIZE + MARGIN) + MARGIN
            rect_y = y * (CELL_SIZE + MARGIN) + MARGIN
            pygame.draw.rect(screen, (200, 200, 200), (rect_x, rect_y, CELL_SIZE, CELL_SIZE))
            letter = letter_grid[y][x]
            text = font.render(letter, True, FONT_COLOR)
            text_rect = text.get_rect(center=(rect_x + CELL_SIZE // 2, rect_y + CELL_SIZE // 2))
            screen.blit(text, text_rect)

    pygame.display.flip()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

pygame.quit()