"""Test dataset: Arabic names by structural difficulty for the pendant
solver. Difficulty = number of disconnected letter groups (letters
ا د ذ ر ز و never connect forward) + dot load + hamzas."""
EASY = ["محمد", "عمر", "حسن"]          # ~1 group, few dots
MEDIUM = ["سارة", "خالد", "ليلى"]       # 1-2 splits, moderate dots
HARD = ["نور", "وردة", "رؤى"]           # multi-split, heavy dots, hamza
ALL = [("easy", n) for n in EASY] + [("medium", n) for n in MEDIUM] + [("hard", n) for n in HARD]
HARD2 = ["آية", "دعاء", "آلاء", "تسنيم", "شهرزاد", "عبدالله", "نورالهدى", "عبدالرحمن"]  # madda, hamza, dots, compounds, 3-9 letters; all 8/8 solver PASS
