#!/usr/bin/env python3
"""Aligned CALEUMS UI screens. Every line is exactly W chars."""

from pathlib import Path

W = 88
I = W - 2  # inner width


def top() -> str:
    return "+" + "-" * I + "+"


def bot() -> str:
    return "+" + "-" * I + "+"


def mid(s: str = "") -> str:
    s = s[:I]
    return "|" + s + " " * (I - len(s)) + "|"


def chrome(url: str) -> str:
    left = "(o)(o)(o)  "
    right = ""
    room = I - len(left) - len(url) - 1
    return "+" + left + url + " " + "-" * max(0, room) + "+"


def nav(trail: str = "") -> list[str]:
    left = "  CALEUMS"
    if trail:
        left += "   /   " + trail
    right = "atelier        account"
    gap = I - len(left) - len(right)
    return [
        mid(left + " " * max(1, gap) + right),
        mid("-" * I),
    ]


def blank(n: int = 1) -> list[str]:
    return [mid("") for _ in range(n)]


SCREENS: list[tuple[str, str, list[str]]] = []


def add(num: str, title: str, lines: list[str]) -> None:
    for i, ln in enumerate(lines):
        if len(ln) != W:
            raise SystemExit(f"{num} {title} L{i+1} len={len(ln)}\n{ln!r}")
    SCREENS.append((num, title, lines))


# ===========================================================================
add(
    "01",
    "Flow",
    [
        chrome("caleums.com"),
        *nav(),
        *blank(1),
        mid("   LANDING         COMPOSE          SIT            FINISH         ATELIER"),
        mid("  +---------+    +---------+    +---------+    +---------+    +---------+"),
        mid("  |         |    |         |    |         |    |         |    |         |"),
        mid("  | [still] | -> | [still] | -> | [still] | -> | [still] | -> | [still] |"),
        mid("  |         |    |         |    |         |    |         |    |         |"),
        mid("  | [begin] |    | 4 looks |    | 4 sits  |    | 4 lights|    | 4 shots |"),
        mid("  +---------+    +---------+    +---------+    +---------+    | [quote] |"),
        mid("                      |                                       +---------+"),
        mid("                      |"),
        mid("                      v   pick 1 of 4"),
        mid("           +----------+ +----------+ +----------+ +----------+"),
        mid("           |  WINDOW  | |   HALO   | |  RAILS   | |   DROP   |"),
        mid("           |          | |          | |          | |          |"),
        mid("           | [still]  | | [still]  | | [still]  | | [still]  |"),
        mid("           |          | |          | |          | |          |"),
        mid("           |  frame   | |  circle  | |  bars    | |  hang    |"),
        mid("           +----------+ +----------+ +----------+ +----------+"),
        *blank(2),
        bot(),
    ],
)

# ===========================================================================
add(
    "02",
    "Landing",
    [
        chrome("caleums.com"),
        *nav(),
        *blank(2),
        mid("                      .--------------------------------."),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |            [still]             |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      '--------------------------------'"),
        *blank(1),
        mid("                      +================================+"),
        mid("                      |    BEGIN WITH YOUR NAME        |"),
        mid("                      +================================+"),
        *blank(1),
        mid("                         18K     made to order     Dubai"),
        *blank(2),
        bot(),
    ],
)

# ===========================================================================
add(
    "03",
    "Compose",
    [
        chrome("caleums.com/compose"),
        *nav("compose"),
        mid("  name  [ ASMA|                             ]             [ EN ]   AR"),
        *blank(1),
        mid("  +----------------------------------+    +------------+  +------------+"),
        mid("  |                                  |    | WINDOW   * |  | HALO       |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |                                  |    |  [still]   |  |  [still]   |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |            [still]               |    |   frame    |  |   circle   |"),
        mid("  |                                  |    +============+  +------------+"),
        mid("  |                                  |"),
        mid("  |                                  |    +------------+  +------------+"),
        mid("  |                                  |    | RAILS      |  | DROP       |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |                                  |    |  [still]   |  |  [still]   |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  +----------------------------------+    |   bars     |  |   hang     |"),
        mid("                                          +------------+  +------------+"),
        *blank(1),
        mid("  +------+  +------+  +------+  +------+"),
        mid("  |  1*  |  |  2   |  |  3   |  |  4   |"),
        mid("  +------+  +------+  +------+  +------+"),
        bot(),
    ],
)

# ===========================================================================
add(
    "04",
    "Looks",
    [
        chrome("caleums.com/compose"),
        *nav("look"),
        *blank(1),
        mid("  +----------------+  +----------------+  +----------------+  +----------------+"),
        mid("  | 1 WINDOW     * |  | 2 HALO         |  | 3 RAILS        |  | 4 DROP         |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |    [still]     |  |    [still]     |  |    [still]     |  |    [still]     |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |                |  |                |  |                |  |                |"),
        mid("  |     frame      |  |     circle     |  |     bars       |  |     hang       |"),
        mid("  +================+  +----------------+  +----------------+  +----------------+"),
        *blank(2),
        mid("  name  [ ASMA                         ]                              next  ->"),
        *blank(1),
        bot(),
    ],
)

# ===========================================================================
add(
    "05",
    "Sit",
    [
        chrome("caleums.com/compose"),
        *nav("look WINDOW  /  sit"),
        mid("  name  [ ASMA                              ]          look  WINDOW"),
        *blank(1),
        mid("  +----------------------------------+    +------------+  +------------+"),
        mid("  |                                  |    | BAR        |  | DROP       |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |                                  |    |  [still]   |  |  [still]   |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |            [still]               |    |  across    |  |   fall     |"),
        mid("  |                                  |    +------------+  +------------+"),
        mid("  |                                  |"),
        mid("  |                                  |    +------------+  +------------+"),
        mid("  |                                  |    | WINDOW   * |  | BRIDGE     |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |                                  |    |  [still]   |  |  [still]   |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  +----------------------------------+    |  inside    |  |  two hang  |"),
        mid("                                          +============+  +------------+"),
        *blank(1),
        mid("  +------+  +------+  +------+  +------+"),
        mid("  |  1   |  |  2   |  |  3*  |  |  4   |"),
        mid("  +------+  +------+  +------+  +------+"),
        bot(),
    ],
)

# ===========================================================================
add(
    "06",
    "Finish",
    [
        chrome("caleums.com/compose"),
        *nav("WINDOW  /  sit WINDOW  /  finish"),
        *blank(1),
        mid("  +----------------------------------+    +------------+  +------------+"),
        mid("  |                                  |    | PLAIN      |  | ACCENT   * |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |                                  |    |  [still]   |  |  [still]   |"),
        mid("  |            [still]               |    |            |  |            |"),
        mid("  |                                  |    |  metal     |  |  one stone |"),
        mid("  |                                  |    +------------+  +============+"),
        mid("  |                                  |"),
        mid("  |                                  |    +------------+  +------------+"),
        mid("  |                                  |    | PAVE       |  | ROSE       |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  |                                  |    |  [still]   |  |  [still]   |"),
        mid("  |                                  |    |            |  |            |"),
        mid("  +----------------------------------+    |  all light |  |  warm edge |"),
        mid("                                          +------------+  +------------+"),
        *blank(1),
        mid("  metal     ( ) yellow     (*) white     ( ) rose"),
        mid("  stones    ( ) none       (*) accent    ( ) pave"),
        mid("  size      [ 22 ]         [ 32 ]                       chain  45cm"),
        bot(),
    ],
)

# ===========================================================================
add(
    "07",
    "Wait",
    [
        chrome("caleums.com/atelier"),
        *nav("atelier"),
        *blank(2),
        mid("                      .--------------------------------."),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |            [still]             |"),
        mid("                      |                                |"),
        mid("                      |          generating            |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      '--------------------------------'"),
        *blank(1),
        mid("        +----------+    +----------+    +----------+    +----------+"),
        mid("        | STUDIO   |    | SKIN     |    | CLOSE    |    | DARK     |"),
        mid("        | 1:1      |    | 4:5      |    | 1:1      |    | 9:16     |"),
        mid("        | queued   |    | queued   |    | queued   |    | queued   |"),
        mid("        +----------+    +----------+    +----------+    +----------+"),
        *blank(1),
        mid("        queued -> generating -> verifying -> ready. retry until a still exists."),
        *blank(1),
        bot(),
    ],
)

# ===========================================================================
add(
    "08",
    "First still",
    [
        chrome("caleums.com/atelier"),
        *nav("atelier"),
        *blank(2),
        mid("                      .--------------------------------."),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      |            [still]             |"),
        mid("                      |                                |"),
        mid("                      |             ready              |"),
        mid("                      |                                |"),
        mid("                      |                                |"),
        mid("                      '--------------------------------'"),
        *blank(1),
        mid("        +==========+    +----------+    +----------+    +----------+"),
        mid("        | STUDIO * |    | SKIN     |    | CLOSE    |    | DARK     |"),
        mid("        | ready    |    |  ....    |    | queued   |    | queued   |"),
        mid("        +==========+    +----------+    +----------+    +----------+"),
        *blank(1),
        mid("        first still is up. the others keep going."),
        *blank(1),
        bot(),
    ],
)

# ===========================================================================
add(
    "09",
    "Atelier",
    [
        chrome("caleums.com/atelier"),
        *nav("atelier"),
        *blank(1),
        mid("  +----------------------------------+    +------------+  +--------+"),
        mid("  |                                  |    | STUDIO 1:1 |  | SKIN   |"),
        mid("  |                                  |    |            |  | 4:5    |"),
        mid("  |                                  |    |  [still]   |  |        |"),
        mid("  |            [still]               |    |            |  | [still]|"),
        mid("  |                                  |    +============+  |        |"),
        mid("  |                                  |                    +--------+"),
        mid("  |                                  |    +------------+     +-----+"),
        mid("  |                                  |    | CLOSE  1:1 |     | DARK|"),
        mid("  |                                  |    |            |     | 9:16|"),
        mid("  +----------------------------------+    |  [still]   |     |     |"),
        mid("                                          |            |     |[pho]|"),
        mid("                                          +------------+     +-----+"),
        *blank(1),
        mid("  +----------+ +----------+ +----------+ +----------+"),
        mid("  | studio * | |   skin   | |  close   | |   dark   |"),
        mid("  +----------+ +----------+ +----------+ +----------+"),
        *blank(1),
        mid("                                         +====================+"),
        mid("                                         |  REQUEST A QUOTE   |"),
        mid("                                         +====================+"),
        bot(),
    ],
)

# ===========================================================================
add(
    "10",
    "Quote",
    [
        chrome("caleums.com/atelier"),
        *nav("atelier"),
        mid("  :                                                                          :"),
        mid("  :                                                                          :"),
        mid("  :                    +--------------------------------+                    :"),
        mid("  :                    | REQUEST A QUOTE                |                    :"),
        mid("  :                    |                                |                    :"),
        mid("  :                    | ASMA                           |                    :"),
        mid("  :                    | WINDOW  /  WINDOW  /  30mm     |                    :"),
        mid("  :                    | yellow  /  accent              |                    :"),
        mid("  :                    |                                |                    :"),
        mid("  :                    | spelling                       |                    :"),
        mid("  :                    | [ ASMA                       ] |                    :"),
        mid("  :                    |                                |                    :"),
        mid("  :                    | +============================+ |                    :"),
        mid("  :                    | | SEND                       | |                    :"),
        mid("  :                    | +============================+ |                    :"),
        mid("  :                    |                                |                    :"),
        mid("  :                    | or WhatsApp                    |                    :"),
        mid("  :                    +--------------------------------+                    :"),
        mid("  :                                                                          :"),
        mid("  :                                                                          :"),
        bot(),
    ],
)

# ===========================================================================
add(
    "11",
    "Mobile · landing",
    [
        chrome("caleums.com"),
        *nav(),
        *blank(1),
        mid("                          .-------------------------."),
        mid("                          | o o o        CALEUMS    |"),
        mid("                          |-------------------------|"),
        mid("                          |                         |"),
        mid("                          |                         |"),
        mid("                          |                         |"),
        mid("                          |        [still]          |"),
        mid("                          |                         |"),
        mid("                          |                         |"),
        mid("                          |                         |"),
        mid("                          |-------------------------|"),
        mid("                          |                         |"),
        mid("                          |  +===================+  |"),
        mid("                          |  | BEGIN WITH NAME   |  |"),
        mid("                          |  +===================+  |"),
        mid("                          |                         |"),
        mid("                          |     18K     Dubai       |"),
        mid("                          |                         |"),
        mid("                          '-------------------------'"),
        *blank(1),
        bot(),
    ],
)

# ===========================================================================
add(
    "12",
    "Mobile · compose",
    [
        chrome("caleums.com/compose"),
        *nav("compose"),
        mid("                          .-------------------------."),
        mid("                          | o o o        CALEUMS    |"),
        mid("                          |-------------------------|"),
        mid("                          |                         |"),
        mid("                          |        [still]          |"),
        mid("                          |                         |"),
        mid("                          |-------------------------|"),
        mid("                          | name [ ASMA          ]  |"),
        mid("                          |       [ EN ]  AR        |"),
        mid("                          |-------------------------|"),
        mid("                          | +-------+  +-------+    |"),
        mid("                          | |WINDOW*|  | HALO  |    |"),
        mid("                          | |[still]|  |[still]|    |"),
        mid("                          | | frame |  |circle |    |"),
        mid("                          | +-------+  +-------+    |"),
        mid("                          | +-------+  +-------+    |"),
        mid("                          | | RAILS |  | DROP  |    |"),
        mid("                          | |[still]|  |[still]|    |"),
        mid("                          | | bars  |  | hang  |    |"),
        mid("                          | +-------+  +-------+    |"),
        mid("                          |-------------------------|"),
        mid("                          | [1*] [2] [3] [4]        |"),
        mid("                          '-------------------------'"),
        bot(),
    ],
)

# ===========================================================================
add(
    "13",
    "Mobile · atelier",
    [
        chrome("caleums.com/atelier"),
        *nav("atelier"),
        *blank(1),
        mid("                          .-------------------------."),
        mid("                          | o o o        CALEUMS    |"),
        mid("                          |-------------------------|"),
        mid("                          |                         |"),
        mid("                          |                         |"),
        mid("                          |        [still]          |"),
        mid("                          |                         |"),
        mid("                          |                         |"),
        mid("                          |-------------------------|"),
        mid("                          | studio* skin close dark |"),
        mid("                          |-------------------------|"),
        mid("                          | WINDOW / 30mm / accent  |"),
        mid("                          |-------------------------|"),
        mid("                          |                         |"),
        mid("                          |  +===================+  |"),
        mid("                          |  | REQUEST A QUOTE   |  |"),
        mid("                          |  +===================+  |"),
        mid("                          |                         |"),
        mid("                          |        WhatsApp         |"),
        mid("                          |                         |"),
        mid("                          '-------------------------'"),
        *blank(1),
        bot(),
    ],
)

# ===========================================================================
add(
    "14",
    "Open",
    [
        chrome("caleums.com"),
        *nav(),
        *blank(3),
        mid("     4 vs 6 looks               open"),
        mid("     square sit                 open"),
        mid("     one vs two styles          open"),
        mid("     video                      out"),
        mid("     finish before / after      on compose"),
        mid("     email gate                 open"),
        mid("     size 22 / 32               working"),
        mid("     pricing                    quote"),
        *blank(6),
        bot(),
    ],
)


def main() -> None:
    out = Path(__file__).resolve().parent / "CALEUMS-JOURNEY-WIREFRAME.md"
    parts = []
    for num, title, lines in SCREENS:
        parts.append(f"<h2>{num}</h2>\n")
        parts.append(f"# {title}\n")
        parts.append("<pre>")
        parts.extend(lines)
        parts.append("</pre>\n")
    out.write_text("\n".join(parts), encoding="utf-8")
    print(f"wrote {out} ({len(SCREENS)} screens, width {W})")


if __name__ == "__main__":
    main()
