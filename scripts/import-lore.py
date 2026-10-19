"""Convert verified Drive text snapshots to Markdown articles; never edit canon.
Run after copying refreshed snapshots into data/sources/. No network calls.
"""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'data/sources'
old={a['slug']:a for a in json.loads((ROOT/'data/articles.json').read_text())}
world=['Premise','Law Holders','Physical Powers and Dragons','The Test','The Axiom and the Law of All Laws','Ordinary People and the Climb','Open Questions']
pantheon=['How the Pantheon Is Ranked','Top-Tier Roster','The Law of Non-Contradiction','The Law of the Excluded Middle','Incompleteness','Number and Sets','The Physics Trio','Social Laws']
creatures=['How Creatures Work','Dragons','Other Creature Families','Hybrids']
subheads=['The Holder','The Feud','Sets: Ensa, the Restorer','Number: Ilar Hesabu, the Uncounted','Relationships','Conservation of Energy: Voss Halloran, the Ledger-Keeper','Entropy: Rudolf Ludwig, the Chancellor of Thermal Decay','Causality: Rushd, the Uncertain Cause','The Iron Law of Oligarchy: Aldous Vane, the Iron Clerk','Supply and Demand: Lian Xiu, the Equilibrium Sovereign',"Goodhart's Law: Mattias Krane, the Moving Target",'To settle','Society','Unicorns: Life and Healing','Phoenixes: Renewal','Kitsune: Illusion and Concealment','Trolls: The Body','How to Read the Tower','The Floors']
def slugify(s): return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def load(name): return (SOURCE/name).read_text().strip().splitlines()
def markdown(lines):
    result=[]
    i=0
    while i<len(lines):
        line=lines[i]
        # Drive exports the roster as one cell per line; restore its four columns.
        if line.strip()=='Group' and i+3<len(lines) and lines[i+1].strip()=='Law':
            cells=[s.strip() for s in lines[i:i+32]]
            assert len(cells)==32 and cells[3]=='Risk of disproof'
            result.extend(['','| '+' | '.join(cells[:4])+' |','| --- | --- | --- | --- |'])
            for n in range(4,32,4): result.append('| '+' | '.join(cells[n:n+4])+' |')
            result.append('');i+=32;continue
        if line in subheads or line.startswith('Floor '): line='### '+line
        elif line.startswith('* ☐ '): line='- [ ] '+line[4:]
        elif re.match(r'^\s*\* [^:]{1,35}: ',line): line=re.sub(r'^(\s*\* )([^:]+:)',r'\1**\2**',line)
        if line.startswith('### '): result.extend(['',line,''])
        else:
            # Separate prose paragraphs from lists while preserving list nesting.
            if result and line and not re.match(r'^\s*(\*|-|\d+\.) ',line) and not line.startswith('|'):
                result.append('')
            elif result and re.match(r'^(\*|-|\d+\.) ',line) and result[-1] and not re.match(r'^(\s*\*|-|\d+\.) ',result[-1]): result.append('')
            result.append(line)
        i+=1
    return '\n'.join(result).strip()
articles=[]
def add(title,category,lines,name,slug=None,stats=None):
    articles.append(dict(slug=slug or slugify(title),title=title,category=category,body=markdown(lines),source=name,stats=stats or {}))
for name,category,headings in [('Quoderat Worldbuilding Notes.md','World & laws',world),('Quoderat The Pantheon.md','The pantheon',pantheon),('Quoderat Creatures.md','Creatures',creatures)]:
    lines=load(name)
    for i,title in enumerate(headings):
        start=lines.index(title)+1
        end=lines.index(headings[i+1]) if i+1<len(headings) else len(lines)
        # Keep the existing bookmark URL when the placeholder app receives its name.
        slug='the-app-and-the-law-of-all-laws' if title=='The Axiom and the Law of All Laws' else None
        add(title,category,lines[start:end],name,slug)
# Existing character cards retain their stable URLs and source-derived fields.
lines=load('Quoderat The Pantheon.md')
for slug,heading,end in [('ilar-hesabu','Number: Ilar Hesabu, the Uncounted','The Physics Trio'),('ensa','Sets: Ensa, the Restorer','Number: Ilar Hesabu, the Uncounted'),('tertia','The Law of the Excluded Middle','Incompleteness')]:
    a=old[slug]
    add(a['title'],'Characters',lines[lines.index(heading)+1:lines.index(end)],'Quoderat The Pantheon.md',slug,a['stats'])
lines=load('Quoderat Creatures.md')
families=['Unicorns: Life and Healing','Phoenixes: Renewal','Kitsune: Illusion and Concealment','Trolls: The Body']
for i,heading in enumerate(families):
    end=families[i+1] if i+1<len(families) else 'Hybrids'
    add(heading,'Creatures',lines[lines.index(heading)+1:lines.index(end)],'Quoderat Creatures.md')
add('The Tower of History','Timeline',load('Quoderat Timeline.md')[2:],'Quoderat Timeline.md','timeline')
# Explicit editorial metadata keeps source disagreements separate from canon.
conflict='> **Source discrepancy — unresolved:** The Worldbuilding Notes say “for now, none escaped” the hunt; Creatures and Timeline describe surviving families. Both source accounts are preserved here pending an author correction.\n\n'
for a in articles:
    if a['slug'] in ('physical-powers-and-dragons','how-creatures-work','timeline'): a['body']=conflict+a['body']
assert len({a['slug'] for a in articles})==len(articles)
assert set(old)<= {a['slug'] for a in articles},'An existing article URL would be lost'
(ROOT/'data/articles.json').write_text(json.dumps(articles,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(articles)} articles from four verified snapshots; existing URLs preserved.')
