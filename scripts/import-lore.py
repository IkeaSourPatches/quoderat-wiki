"""Convert verified Drive text snapshots to Markdown articles; never edit canon.
Run after copying refreshed snapshots into data/sources/. No network calls.
"""

import difflib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources'
old = {a['slug']: a for a in json.loads((ROOT / 'data/articles.json').read_text(encoding='utf-8'))}
world = [
    'Premise',
    'Law Holders',
    'Physical Powers and Dragons',
    'The Test',
    'The Axiom and the Law of All Laws',
    'Ordinary People and the Climb',
    'Open Questions',
]
pantheon = [
    'How the Pantheon Is Ranked',
    'Top-Tier Roster',
    'The Law of Non-Contradiction',
    'The Law of the Excluded Middle',
    'Incompleteness',
    'Number and Sets',
    'The Physics Trio',
    'Social Laws',
    'Minor Laws',
]
creatures = ['How Creatures Work', 'Dragons', 'Other Creature Families', 'Hybrids']
subheads = [
    'The Holder',
    'The Feud',
    'Sets: Ensa, the Restorer',
    'Number: Ilar Hesabu, the Uncounted',
    'Relationships',
    'Conservation of Energy: Voss Halloran, the Ledger-Keeper',
    'Entropy: Rudolf Ludwig, the Chancellor of Thermal Decay',
    'Causality: Rushd, the Uncertain Cause',
    'The Iron Law of Oligarchy: Aldous Vane, the Iron Clerk',
    'Supply and Demand: Lian Xiu, the Equilibrium Sovereign',
    "Goodhart's Law: Mattias Krane, the Moving Target",
    'To settle',
    'Society',
    'Unicorns: Life and Healing',
    'Phoenixes: Renewal',
    'Kitsune: Illusion and Concealment',
    'Trolls: The Body',
    'How to Read the Tower',
    'The Floors',
]
# Section headings that only bound other articles. Minor Laws duplicated the five
# character pages it contains, so it no longer gets its own article.
RETIRED = {'minor-laws'}


def slugify(s):
    return re.sub('[^a-z0-9]+', '-', s.lower()).strip('-')


def load(name, lang='en'):
    # Drive returns document tabs together. Separate them before section parsing.
    text = (SOURCE / name).read_text(encoding='utf-8').strip()
    en, separator, zh = text.partition('\n中文\n')
    if lang == 'zh' and not separator:
        raise ValueError(f'Missing Chinese tab: {name}')
    lines = (zh if lang == 'zh' else en).splitlines()
    while lines and lines[0] in ('Tab 1', 'English'):
        lines.pop(0)
    # Drive adds an author byline after the date ("Oct 19, 2026 · @Name"); keep the date, drop the name.
    lines = [re.sub(r' · @[^·]+$', '', line) for line in lines]
    return Lines(lines, name, lang)


class Lines(list):
    """Snapshot lines that remember their source file, for clear error messages."""

    def __init__(self, items, name, lang):
        super().__init__(items)
        self.name = name
        self.lang = lang


def norm(s):
    # Drive edits often swap straight/curly quotes or spacing; ignore those differences.
    for a, b in (('\u2018', "'"), ('\u2019', "'"), ('\u201c', '"'), ('\u201d', '"')):
        s = s.replace(a, b)
    return ' '.join(s.split()).casefold()


def find(lines, heading):
    """Index of a heading line, tolerant of quote style, spacing and letter case.
    A renamed heading stops the import with the closest matches instead of a bare ValueError."""
    if heading in lines:
        return lines.index(heading)  # exact match keeps historical behaviour
    target = norm(heading)
    for i, line in enumerate(lines):
        if norm(line) == target:
            return i
    tab = 'Chinese' if getattr(lines, 'lang', 'en') == 'zh' else 'English'
    close = difflib.get_close_matches(heading, [line.strip() for line in lines if line.strip()], n=3, cutoff=0.5)
    hint = f' Closest lines: {close}.' if close else ''
    raise SystemExit(
        f'import-lore: heading {heading!r} not found in the {tab} tab of '
        f'{getattr(lines, "name", "a snapshot")}.{hint} If it was renamed in Google Drive, '
        'update the matching heading list in scripts/import-lore.py.'
    )


zh_world = ['前提', '执律者', '物理之力与龙族', '试炼', '公理与万法之法', '普通人与攀登', '未决问题']
zh_pantheon = [
    '众神如何排位',
    '顶层名单',
    '不矛盾律',
    '排中律',
    '不完备性',
    '数与集合',
    '物理三巨头',
    '社会法则',
    '小法则',
]
zh_creatures = ['神兽如何运作', '龙族', '其他神兽族群', '混血种']
zh_subheads = [
    '执律者',
    '宿怨',
    '集合：恩莎，复原者',
    '数：伊拉尔·赫萨布，不计者',
    '关系',
    '能量守恒：沃斯·哈洛兰，记账人',
    '熵：鲁道夫·路德维希，热寂宰相',
    '因果律：鲁什德，不确定之因',
    '寡头铁律：奥尔德斯·维恩，铁律书记',
    '供求律：连秀，均衡女王',
    '古德哈特定律：马蒂亚斯·克兰，移动靶',
    '待定事项',
    '社会',
    '独角兽：生命与治愈',
    '不死鸟：重生',
    '狐仙：幻术与隐匿',
    '巨魔：躯体',
    '如何阅读这座塔',
    '楼层',
]
subheads += [
    'The Pigeonhole Principle: Kalyan, the Quiet Heir',
    'The Four Color Theorem: Sai, the Border-Baiter',
    'The Halting Problem: Akhil, the Unfinished Answer',
    "Mendel's Laws: Zaid, the Patient Gardener",
    'The Law of Superposition: Vera, the Witness Beneath',
    'The Elder Council',
]
zh_subheads += [
    '抽屉原理：卡利扬，沉默的继承人',
    '四色定理：彩，诱边人',
    '停机问题：阿基尔，未完的答案',
    '孟德尔定律：扎伊德，耐心的园丁',
    '叠覆律：维拉，地下的见证者',
    '长老议会',
]


def markdown(lines):
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Drive exports the roster as one cell per line; restore its four columns.
        if line.strip() in ('Group', '组别') and i + 3 < len(lines) and lines[i + 1].strip() in ('Law', '法则'):
            cells = [s.strip() for s in lines[i : i + 32]]
            assert len(cells) == 32 and cells[3] in ('Risk of disproof', '被证伪的风险')
            result.extend(['', '| ' + ' | '.join(cells[:4]) + ' |', '| --- | --- | --- | --- |'])
            for n in range(4, 32, 4):
                result.append('| ' + ' | '.join(cells[n : n + 4]) + ' |')
            result.append('')
            i += 32
            continue
        if (
            line in subheads + zh_subheads
            or line.startswith('Floor ')
            or re.match(r'^第[零一二三四五六七八九十]+层：', line)
        ):
            line = '### ' + line
        elif line.startswith('* ☐ '):
            line = '- [ ] ' + line[4:]
        elif re.match(r'^\s*\* [^:：]{1,35}[:：]', line):
            line = re.sub(r'^(\s*\* )([^:：]+[:：])', r'\1**\2** ', line)
        if line.startswith('### '):
            result.extend(['', line, ''])
        else:
            # Separate prose paragraphs from lists while preserving list nesting.
            if result and line and not re.match(r'^\s*(\*|-|\d+\.) ', line) and not line.startswith('|'):
                result.append('')
            elif (
                result
                and re.match(r'^(\*|-|\d+\.) ', line)
                and result[-1]
                and not re.match(r'^(\s*\*|-|\d+\.) ', result[-1])
            ):
                result.append('')
            result.append(line)
        i += 1
    return '\n'.join(result).strip()


articles = []


def add(title, category, lines, name, slug=None, stats=None):
    articles.append(
        dict(
            slug=slug or slugify(title),
            title=title,
            category=category,
            body=markdown(lines),
            source=name,
            stats=stats or {},
        )
    )


for name, category, headings, zh_headings in [
    ('Quoderat Worldbuilding Notes.md', 'World & laws', world, zh_world),
    ('Quoderat The Pantheon.md', 'The pantheon', pantheon, zh_pantheon),
    ('Quoderat Creatures.md', 'Creatures', creatures, zh_creatures),
]:
    lines = load(name)
    for i, title in enumerate(headings):
        start = find(lines, title) + 1
        end = find(lines, headings[i + 1]) if i + 1 < len(headings) else len(lines)
        # Keep the existing bookmark URL when the placeholder app receives its name.
        slug = 'the-app-and-the-law-of-all-laws' if title == 'The Axiom and the Law of All Laws' else None
        if (slug or slugify(title)) in RETIRED:
            continue
        add(title, category, lines[start:end], name, slug)
        zlines = load(name, 'zh')
        ztitle = zh_headings[i]
        zend = find(zlines, zh_headings[i + 1]) if i + 1 < len(zh_headings) else len(zlines)
        articles[-1]['translations'] = {
            'zh': {'title': ztitle, 'body': markdown(zlines[find(zlines, ztitle) + 1 : zend]), 'stats': {}}
        }
# Existing character cards retain their stable URLs and source-derived fields.
lines = load('Quoderat The Pantheon.md')
for slug, heading, end in [
    ('ilar-hesabu', 'Number: Ilar Hesabu, the Uncounted', 'The Physics Trio'),
    ('ensa', 'Sets: Ensa, the Restorer', 'Number: Ilar Hesabu, the Uncounted'),
    ('tertia', 'The Law of the Excluded Middle', 'Incompleteness'),
]:
    a = old[slug]
    add(
        a['title'],
        'Characters',
        lines[find(lines, heading) + 1 : find(lines, end)],
        'Quoderat The Pantheon.md',
        slug,
        a['stats'],
    )
# Chinese names and dossiers follow the current translated source, not new names.
zlines = load('Quoderat The Pantheon.md', 'zh')
characters = {
    'ilar-hesabu': (
        '伊拉尔·赫萨布',
        '数：伊拉尔·赫萨布，不计者',
        '物理三巨头',
        {
            'Title': '不计者',
            'Held law': '数',
            'Origin': '继承',
            'Affiliation': '土龙族',
            'Status': '隐居',
            'Elemental power': '无',
        },
    ),
    'ensa': (
        '恩莎',
        '集合：恩莎，复原者',
        '数：伊拉尔·赫萨布，不计者',
        {
            'Title': '复原者',
            'Held law': '集合',
            'Origin': '继承并修订',
            'Affiliation': '与逻辑诸神亲近',
            'Status': '活跃',
            'Elemental power': '无',
        },
    ),
    'tertia': (
        '特尔提娅',
        '排中律',
        '不完备性',
        {'Held law': '排中律', 'Origin': '继承', 'Lineage': '王朝传承', 'Ally': '矛盾', 'Rival': '未决之问'},
    ),
}
for a in articles:
    if a['slug'] in characters:
        title, start, end, stats = characters[a['slug']]
        a['translations'] = {
            'zh': {
                'title': title,
                'body': markdown(zlines[find(zlines, start) + 1 : find(zlines, end)]),
                'stats': stats,
            }
        }
# Each named or titled Pantheon character has a stable, bilingual reading page.
# Boundaries refer to the source headings so imports keep the complete biography.
character_sections = [
    (
        'the-spear-and-shield',
        'The Spear and Shield',
        '矛盾',
        'The Law of Non-Contradiction',
        '不矛盾律',
        'The Law of the Excluded Middle',
        '排中律',
        'Non-Contradiction',
        '不矛盾律',
    ),
    (
        'the-open-question',
        'The Open Question',
        '未决之问',
        'Incompleteness',
        '不完备性',
        'Number and Sets',
        '数与集合',
        'Incompleteness',
        '不完备性',
    ),
    (
        'voss-halloran',
        'Voss Halloran',
        '沃斯·哈洛兰',
        subheads[5],
        zh_subheads[5],
        subheads[6],
        zh_subheads[6],
        'Conservation of Energy',
        '能量守恒',
    ),
    (
        'rudolf-ludwig',
        'Rudolf Ludwig',
        '鲁道夫·路德维希',
        subheads[6],
        zh_subheads[6],
        subheads[7],
        zh_subheads[7],
        'Entropy',
        '熵',
    ),
    ('rushd', 'Rushd', '鲁什德', subheads[7], zh_subheads[7], 'Social Laws', '社会法则', 'Causality', '因果律'),
    (
        'aldous-vane',
        'Aldous Vane',
        '奥尔德斯·维恩',
        subheads[8],
        zh_subheads[8],
        subheads[9],
        zh_subheads[9],
        'The Iron Law of Oligarchy',
        '寡头铁律',
    ),
    (
        'lian-xiu',
        'Lian Xiu',
        '连秀',
        subheads[9],
        zh_subheads[9],
        subheads[10],
        zh_subheads[10],
        'Supply and Demand',
        '供求律',
    ),
    (
        'mattias-krane',
        'Mattias Krane',
        '马蒂亚斯·克兰',
        subheads[10],
        zh_subheads[10],
        'Minor Laws',
        '小法则',
        "Goodhart's Law",
        '古德哈特定律',
    ),
]
character_sections += [
    (
        'kalyan',
        'Kalyan',
        '卡利扬',
        'The Pigeonhole Principle: Kalyan, the Quiet Heir',
        '抽屉原理：卡利扬，沉默的继承人',
        'The Four Color Theorem: Sai, the Border-Baiter',
        '四色定理：彩，诱边人',
        'Pigeonhole Principle',
        '抽屉原理',
    ),
    (
        'sai',
        'Sai',
        '彩',
        'The Four Color Theorem: Sai, the Border-Baiter',
        '四色定理：彩，诱边人',
        'The Halting Problem: Akhil, the Unfinished Answer',
        '停机问题：阿基尔，未完的答案',
        'Four Color Theorem',
        '四色定理',
    ),
    (
        'akhil',
        'Akhil',
        '阿基尔',
        'The Halting Problem: Akhil, the Unfinished Answer',
        '停机问题：阿基尔，未完的答案',
        "Mendel's Laws: Zaid, the Patient Gardener",
        '孟德尔定律：扎伊德，耐心的园丁',
        'Halting Problem',
        '停机问题',
    ),
    (
        'zaid',
        'Zaid',
        '扎伊德',
        "Mendel's Laws: Zaid, the Patient Gardener",
        '孟德尔定律：扎伊德，耐心的园丁',
        'The Law of Superposition: Vera, the Witness Beneath',
        '叠覆律：维拉，地下的见证者',
        "Mendel's Laws",
        '孟德尔定律',
    ),
    (
        'vera',
        'Vera',
        '维拉',
        'The Law of Superposition: Vera, the Witness Beneath',
        '叠覆律：维拉，地下的见证者',
        'To settle',
        '待定事项',
        'Law of Superposition',
        '叠覆律',
    ),
]
lines = load('Quoderat The Pantheon.md')
zlines = load('Quoderat The Pantheon.md', 'zh')
for slug, title, ztitle, start, zstart, end, zend, law, zlaw in character_sections:
    add(
        title,
        'Characters',
        [start] + lines[find(lines, start) + 1 : find(lines, end)],
        'Quoderat The Pantheon.md',
        slug,
        {'Held law': law},
    )
    articles[-1]['translations'] = {
        'zh': {
            'title': ztitle,
            'body': markdown([zstart] + zlines[find(zlines, zstart) + 1 : find(zlines, zend)]),
            'stats': {'Held law': zlaw},
        }
    }
# Reciprocal relationship is stated in Akhil's profile in the same source.
question = next(a for a in articles if a['slug'] == 'the-open-question')
akhil = next(a for a in articles if a['slug'] == 'akhil')
for lang, heading, partner in [
    ('en', 'Relationship — Akhil', 'Akhil (dating online, long-distance)'),
    ('zh', '关系——阿基尔', '阿基尔（异地网恋）'),
]:
    target = question if lang == 'en' else question['translations']['zh']
    original = akhil if lang == 'en' else akhil['translations']['zh']
    marker = '* **Relationship:' if lang == 'en' else '* **感情：'
    relationship = next(line for line in original['body'].splitlines() if line.startswith(marker))
    target['body'] += (
        '\n\n### '
        + heading
        + '\n\n'
        + ('From Akhil’s profile:' if lang == 'en' else '摘自阿基尔的人物档案：')
        + '\n\n'
        + relationship
        + '\n\n['
        + ('Read Akhil’s profile' if lang == 'en' else '阅读阿基尔的人物档案')
        + '](#akhil)'
    )
    target['stats']['Relationship'] = partner
lines = load('Quoderat Creatures.md')
families = ['Unicorns: Life and Healing', 'Phoenixes: Renewal', 'Kitsune: Illusion and Concealment', 'Trolls: The Body']
for i, heading in enumerate(families):
    end = families[i + 1] if i + 1 < len(families) else 'Hybrids'
    add(heading, 'Creatures', lines[find(lines, heading) + 1 : find(lines, end)], 'Quoderat Creatures.md')
    zfamilies = ['独角兽：生命与治愈', '不死鸟：重生', '狐仙：幻术与隐匿', '巨魔：躯体']
    zlines = load('Quoderat Creatures.md', 'zh')
    zhead = zfamilies[i]
    zend = zfamilies[i + 1] if i + 1 < len(zfamilies) else '混血种'
    articles[-1]['translations'] = {
        'zh': {'title': zhead, 'body': markdown(zlines[find(zlines, zhead) + 1 : find(zlines, zend)]), 'stats': {}}
    }
# Dragon elders share physical powers; they are not law holders.
lines = load('Quoderat Creatures.md')
zlines = load('Quoderat Creatures.md', 'zh')
start = find(lines, 'The Elder Council') + 1
zstart = find(zlines, '长老议会') + 1
add('The Elder Council', 'Creatures', lines[start : find(lines, 'Other Creature Families')], 'Quoderat Creatures.md')
articles[-1]['translations'] = {
    'zh': {'title': '长老议会', 'body': markdown(zlines[zstart : find(zlines, '其他神兽族群')]), 'stats': {}}
}
elders = [
    ('Ersetu', '埃尔塞图', 'Keeper of Deep Vaults', '深窖守护者', 'Earth', '土'),
    ('Imaq', '伊玛克', 'The Tide-Easer', '平潮者', 'Water', '水'),
    ('Salkhi', '萨勒希', 'The Horizon-Eye', '天际之眼', 'Air', '气'),
    ('Illapa', '伊拉帕', 'The Unforgiving Spark', '不赦之焰', 'Plasma', '等离子'),
]
for name, zname, title, ztitle, element, zelement in elders:
    biography = next(line for line in lines[start:] if line.startswith('* ' + name + ' ('))
    zbiography = next(line for line in zlines[zstart:] if line.startswith('* ' + zname + '（'))
    add(
        name,
        'Characters',
        [biography, '', lines[start]],
        'Quoderat Creatures.md',
        stats={'Title': title, 'Elemental power': element, 'Role': 'Dragon elder'},
    )
    articles[-1]['translations'] = {
        'zh': {
            'title': zname,
            'body': markdown([zbiography, '', zlines[zstart]]),
            'stats': {'Title': ztitle, 'Elemental power': zelement, 'Role': '龙族长老'},
        }
    }
add('The Tower of History', 'Timeline', load('Quoderat Timeline.md')[2:], 'Quoderat Timeline.md', 'timeline')
articles[-1]['translations'] = {
    'zh': {'title': '历史之塔', 'body': markdown(load('Quoderat Timeline.md', 'zh')[2:]), 'stats': {}}
}
# Explicit editorial metadata keeps source disagreements separate from canon.
conflict = '> **Source discrepancy — unresolved:** The Worldbuilding Notes say “for now, none escaped” the hunt; Creatures and Timeline describe surviving families. Both source accounts are preserved here pending an author correction.\n\n'
for a in articles:
    if a['slug'] in ('physical-powers-and-dragons', 'how-creatures-work', 'timeline'):
        a['body'] = conflict + a['body']
        a['translations']['zh']['body'] = (
            '> **来源矛盾，尚未解决：**《世界观笔记》称狩猎中“目前无一逃脱”，但《神兽》与《时间线》记载了幸存族群。此处保留两种记载，等待作者修订。\n\n'
            + a['translations']['zh']['body']
        )
assert all(a.get('translations', {}).get('zh', {}).get('body') for a in articles)
assert len({a['slug'] for a in articles}) == len(articles)
assert set(old) - RETIRED <= {a['slug'] for a in articles}, 'An existing article URL would be lost'
(ROOT / 'data/articles.json').write_text(json.dumps(articles, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(articles)} bilingual articles from four verified snapshots; existing URLs preserved.')
