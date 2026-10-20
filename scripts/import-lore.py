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
def load(name, lang='en'):
    # Drive returns document tabs together. Separate them before section parsing.
    text=(SOURCE/name).read_text().strip()
    en, separator, zh=text.partition('\n中文\n')
    if lang=='zh' and not separator: raise ValueError(f'Missing Chinese tab: {name}')
    lines=(zh if lang=='zh' else en).splitlines()
    while lines and lines[0] in ('Tab 1','English'): lines.pop(0)
    return lines
zh_world=['前提','执律者','物理之力与龙族','试炼','公理与万法之法','普通人与攀登','未决问题']
zh_pantheon=['众神如何排位','顶层名单','不矛盾律','排中律','不完备性','数与集合','物理三巨头','社会法则']
zh_creatures=['神兽如何运作','龙族','其他神兽族群','混血种']
zh_subheads=['执律者','宿怨','集合：恩莎，复原者','数：伊拉尔·赫萨布，不计者','关系','能量守恒：沃斯·哈洛兰，记账人','熵：鲁道夫·路德维希，热寂宰相','因果律：鲁什德，不确定之因','寡头铁律：奥尔德斯·维恩，铁律书记','供求律：连秀，均衡女王','古德哈特定律：马蒂亚斯·克兰，移动靶','待定事项','社会','独角兽：生命与治愈','不死鸟：重生','狐仙：幻术与隐匿','巨魔：躯体','如何阅读这座塔','楼层']
def markdown(lines):
    result=[]
    i=0
    while i<len(lines):
        line=lines[i]
        # Drive exports the roster as one cell per line; restore its four columns.
        if line.strip() in ('Group','组别') and i+3<len(lines) and lines[i+1].strip() in ('Law','法则'):
            cells=[s.strip() for s in lines[i:i+32]]
            assert len(cells)==32 and cells[3] in ('Risk of disproof','被证伪的风险')
            result.extend(['','| '+' | '.join(cells[:4])+' |','| --- | --- | --- | --- |'])
            for n in range(4,32,4): result.append('| '+' | '.join(cells[n:n+4])+' |')
            result.append('');i+=32;continue
        if line in subheads+zh_subheads or line.startswith('Floor ') or re.match(r'^第[零一二三四五六七八九十]+层：',line): line='### '+line
        elif line.startswith('* ☐ '): line='- [ ] '+line[4:]
        elif re.match(r'^\s*\* [^:：]{1,35}[:：]',line): line=re.sub(r'^(\s*\* )([^:：]+[:：])',r'\1**\2**',line)
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
for name,category,headings,zh_headings in [('Quoderat Worldbuilding Notes.md','World & laws',world,zh_world),('Quoderat The Pantheon.md','The pantheon',pantheon,zh_pantheon),('Quoderat Creatures.md','Creatures',creatures,zh_creatures)]:
    lines=load(name)
    for i,title in enumerate(headings):
        start=lines.index(title)+1
        end=lines.index(headings[i+1]) if i+1<len(headings) else len(lines)
        # Keep the existing bookmark URL when the placeholder app receives its name.
        slug='the-app-and-the-law-of-all-laws' if title=='The Axiom and the Law of All Laws' else None
        add(title,category,lines[start:end],name,slug)
        zlines=load(name,'zh'); ztitle=zh_headings[i]
        zend=zlines.index(zh_headings[i+1]) if i+1<len(zh_headings) else len(zlines)
        articles[-1]['translations']={'zh':{'title':ztitle,'body':markdown(zlines[zlines.index(ztitle)+1:zend]),'stats':{}}}
# Existing character cards retain their stable URLs and source-derived fields.
lines=load('Quoderat The Pantheon.md')
for slug,heading,end in [('ilar-hesabu','Number: Ilar Hesabu, the Uncounted','The Physics Trio'),('ensa','Sets: Ensa, the Restorer','Number: Ilar Hesabu, the Uncounted'),('tertia','The Law of the Excluded Middle','Incompleteness')]:
    a=old[slug]
    add(a['title'],'Characters',lines[lines.index(heading)+1:lines.index(end)],'Quoderat The Pantheon.md',slug,a['stats'])
# Chinese names and dossiers follow the current translated source, not new names.
zlines=load('Quoderat The Pantheon.md','zh')
characters={
 'ilar-hesabu':('伊拉尔·赫萨布','数：伊拉尔·赫萨布，不计者','物理三巨头',{'Title':'不计者','Held law':'数','Origin':'继承','Affiliation':'土龙族','Status':'隐居','Elemental power':'无'}),
 'ensa':('恩莎','集合：恩莎，复原者','数：伊拉尔·赫萨布，不计者',{'Title':'复原者','Held law':'集合','Origin':'继承并修订','Affiliation':'与逻辑诸神亲近','Status':'活跃','Elemental power':'无'}),
 'tertia':('特尔提娅','排中律','不完备性',{'Held law':'排中律','Origin':'继承','Lineage':'王朝传承','Ally':'矛盾','Rival':'未决之问'})}
for a in articles:
 if a['slug'] in characters:
  title,start,end,stats=characters[a['slug']]
  a['translations']={'zh':{'title':title,'body':markdown(zlines[zlines.index(start)+1:zlines.index(end)]),'stats':stats}}
lines=load('Quoderat Creatures.md')
families=['Unicorns: Life and Healing','Phoenixes: Renewal','Kitsune: Illusion and Concealment','Trolls: The Body']
for i,heading in enumerate(families):
    end=families[i+1] if i+1<len(families) else 'Hybrids'
    add(heading,'Creatures',lines[lines.index(heading)+1:lines.index(end)],'Quoderat Creatures.md')
    zfamilies=['独角兽：生命与治愈','不死鸟：重生','狐仙：幻术与隐匿','巨魔：躯体']
    zlines=load('Quoderat Creatures.md','zh'); zhead=zfamilies[i]; zend=zfamilies[i+1] if i+1<len(zfamilies) else '混血种'
    articles[-1]['translations']={'zh':{'title':zhead,'body':markdown(zlines[zlines.index(zhead)+1:zlines.index(zend)]),'stats':{}}}
add('The Tower of History','Timeline',load('Quoderat Timeline.md')[2:],'Quoderat Timeline.md','timeline')
articles[-1]['translations']={'zh':{'title':'历史之塔','body':markdown(load('Quoderat Timeline.md','zh')[2:]),'stats':{}}}
# Explicit editorial metadata keeps source disagreements separate from canon.
conflict='> **Source discrepancy — unresolved:** The Worldbuilding Notes say “for now, none escaped” the hunt; Creatures and Timeline describe surviving families. Both source accounts are preserved here pending an author correction.\n\n'
for a in articles:
    if a['slug'] in ('physical-powers-and-dragons','how-creatures-work','timeline'):
        a['body']=conflict+a['body']
        a['translations']['zh']['body']='> **来源矛盾，尚未解决：**《世界观笔记》称狩猎中“目前无一逃脱”，但《神兽》与《时间线》记载了幸存族群。此处保留两种记载，等待作者修订。\n\n'+a['translations']['zh']['body']
assert all(a.get('translations',{}).get('zh',{}).get('body') for a in articles)
assert len({a['slug'] for a in articles})==len(articles)
assert set(old)<= {a['slug'] for a in articles},'An existing article URL would be lost'
(ROOT/'data/articles.json').write_text(json.dumps(articles,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(articles)} bilingual articles from four verified snapshots; existing URLs preserved.')
