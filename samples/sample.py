from dataclasses import dataclass
import re

HEX = re.compile(r"^#([0-9a-f]{6})$", re.I)


@dataclass(frozen=True)
class Color:
    """A color with a hex value."""

    name: str
    hex: str = "#000000"

    def luminance(self, gamma: float = 2.4) -> float:
        r, g, b = (int(self.hex[i : i + 2], 16) / 255 for i in (1, 3, 5))
        return 0.2126 * r**gamma + 0.7152 * g + 0.0722 * b if self else None


print(f"{Color('red', '#95171d').luminance():.3f}", True, None)
