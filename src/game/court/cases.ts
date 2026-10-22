// Cases for the Spear and Shield's court. Each testimony has exactly one statement
// that contradicts one piece of evidence; scripts/check-game.mjs enforces that.
// The cases are game adaptations built on canon rules, not canon events.

export type T = { en: string; zh: string };
export type Mood = 'calm' | 'smug' | 'nervous' | 'shocked' | 'broken';
export type Who = 'you' | 'witness' | 'magistrate' | 'cat' | 'narrator';
export type Line = { who: Who; text: T; mood?: Mood };
export type Statement = { id: string; text: T; press: Line[]; hidden?: boolean; reveals?: string; contradicts?: string };
export type Testimony = { title: T; statements: Statement[]; wrong: T[]; breakthrough: Line[] };
export type Evidence = { id: string; name: T; detail: T; icon: 'book' | 'scroll' | 'box' | 'bracelet' | 'pouch' | 'seal' };
export type Mask = 'lamp' | 'dice' | 'horn';
export type Case = { id: string; title: T; witness: { name: T; role: T; mask: Mask }; intro: Line[]; evidence: Evidence[]; testimonies: Testimony[]; resolution: Line[] };

const t = (en: string, zh: string): T => ({ en, zh });

export const cases: Case[] = [
  {
    id: 'lamp-market',
    title: t('Noon in the lamp market', '灯市正午'),
    witness: { name: t('Pell', '佩尔'), role: t('Lamp-oil seller', '灯油摊主'), mask: 'lamp' },
    intro: [
      { who: 'narrator', text: t('A strongbox was stolen from a lamp-oil stall at noon. The stall-keeper swears a troll did it, and Gorrum, a troll trader, stands accused.', '正午时分，一个灯油摊的钱箱被偷了。摊主一口咬定是巨魔干的，巨魔商人戈鲁姆因此被告上法庭。') },
      { who: 'narrator', text: t('At the back of the court, an old man strokes a sleeping cat. Nobody looks at him.', '法庭后排，一位老人抚摸着一只熟睡的猫。没有人看他一眼。') },
      { who: 'magistrate', text: t('The witness will testify. Advocate, if anything she says cannot be true, show the court why.', '请证人作证。辩护人，如果她的证词中有不可能成立之处，请向法庭说明理由。') },
      { who: 'narrator', text: t('Step through the testimony. Press a statement to hear more. When a statement contradicts a piece of evidence, choose the evidence and present it.', '逐句查看证词。追问某句证词，可以听到更多细节。当某句证词与某件证据矛盾时，选中那件证据并出示。') },
    ],
    evidence: [
      { id: 'trolls', icon: 'book', name: t('Creatures: trolls', '神兽：巨魔'), detail: t('Sunlight turns trolls to stone. In the Great Hunt, the hunters used daylight against them.', '阳光会把巨魔变成石头。大狩猎时，猎人正是利用日光对付它们。') },
      { id: 'weather', icon: 'scroll', name: t('Harbour master’s note', '港务长的记录'), detail: t('Clear skies all day. The noon bell rang on time.', '全天晴朗无云。正午的钟准时敲响。') },
      { id: 'box', icon: 'box', name: t('The strongbox', '钱箱'), detail: t('Iron and dented, found empty by the well. Lamp oil is smeared on the handle.', '铁制，有凹痕，在井边被发现时已空无一物。把手上沾着灯油。') },
      { id: 'tally', icon: 'seal', name: t('Gorrum’s trade ledger', '戈鲁姆的贸易账簿'), detail: t('Carved in stone, like every troll record. He trades at the market every night.', '像所有巨魔的记录一样刻在石头上。他每晚都到集市做买卖。') },
    ],
    testimonies: [{
      title: t('What I saw', '我看到的'),
      statements: [
        { id: 'p1', text: t('My stall’s in the lamp market. I’d just lit the noon lamp.', '我的摊位在灯市。我刚点上正午的灯。'), press: [
          { who: 'you', text: t('The noon lamp?', '正午的灯？') },
          { who: 'witness', text: t('Every stall lights one when the noon bell rings. It’s tradition.', '正午钟一响，每个摊位都要点一盏灯。这是规矩。'), mood: 'calm' }] },
        { id: 'p2', text: t('Then I heard my strongbox hit the cobbles.', '接着我听见我的钱箱砸在石板路上。'), press: [
          { who: 'you', text: t('You didn’t see it fall?', '你没看到它掉下去？') },
          { who: 'witness', text: t('My back was turned. But iron makes a racket.', '我当时背对着它。不过铁箱子的动静可大了。'), mood: 'calm' }] },
        { id: 'p3', contradicts: 'trolls', text: t('I spun round and saw a troll running off with it, in broad daylight.', '我一转身，就看见一个巨魔抱着它跑了，光天化日之下。'), press: [
          { who: 'you', text: t('A troll. You’re sure?', '巨魔？你确定？') },
          { who: 'witness', text: t('Big, grey, lumpy. You don’t mistake a troll.', '又大又灰，疙疙瘩瘩的。巨魔可认不错。'), mood: 'smug' }] },
        { id: 'p4', text: t('It was Gorrum. I’d know that scar anywhere.', '就是戈鲁姆。他那道疤我到哪儿都认得。'), press: [
          { who: 'you', text: t('You know Gorrum well?', '你很熟悉戈鲁姆？') },
          { who: 'witness', text: t('Everyone does. He’s in the market every night.', '谁不熟啊。他每晚都在集市。'), mood: 'calm' }] },
        { id: 'p5', text: t('So he’s the thief. Simple.', '所以他就是小偷。很简单。'), press: [
          { who: 'witness', text: t('What more do you need? Arrest the rock.', '你还要什么？把那块石头抓起来就是了。'), mood: 'smug' }] },
      ],
      wrong: [t('That’s got nothing to do with what I said.', '这跟我说的话有什么关系？'), t('Are you even listening?', '你到底有没有在听？')],
      breakthrough: [
        { who: 'you', text: t('A troll in the noon sun wouldn’t be running anywhere. Sunlight turns trolls to stone.', '正午阳光下的巨魔哪儿也跑不了。阳光会把巨魔变成石头。') },
        { who: 'witness', text: t('…It was very bright. Maybe I saw someone big in a grey cloak. Maybe I assumed.', '……那会儿太亮了。也许我看见的是一个披着灰斗篷的大个子。也许是我想当然了。'), mood: 'broken' },
      ],
    }],
    resolution: [
      { who: 'magistrate', text: t('The case against Gorrum is dismissed.', '对戈鲁姆的指控不予成立。') },
      { who: 'narrator', text: t('Gorrum goes home well before sunrise. Whoever wore the grey cloak is still out there, and probably isn’t a troll.', '戈鲁姆在日出前早早回了家。那个披灰斗篷的人还逍遥在外，而且多半不是巨魔。') },
      { who: 'cat', text: t('The cat opens one eye, then closes it again.', '猫睁开一只眼，又闭上了。') },
    ],
  },
  {
    id: 'broke-the-axiom',
    title: t('The man who broke the Axiom', '破解公理的男人'),
    witness: { name: t('Dov', '多夫'), role: t('Gambler, and self-declared holder of the Law of All Laws', '赌徒，自封的万法之法执律者'), mask: 'dice' },
    intro: [
      { who: 'narrator', text: t('In a harbour tavern, a gambler named Dov bet the whole room he could break the Axiom before the bell. He cracked his bracelet on the bar, and now he wants his winnings, and the Law of All Laws.', '在一家港口酒馆里，赌徒多夫跟满屋子的人打赌，说他能在钟响前破解公理。他把手环往吧台上一磕，裂了，现在他要拿走赌金，外加万法之法。') },
      { who: 'magistrate', text: t('The tavern-keeper refuses to pay. Witness, tell the court what happened.', '酒馆老板拒绝付钱。证人，请向法庭陈述经过。') },
      { who: 'witness', text: t('Gladly. History was made that night.', '乐意之至。那晚可是创造了历史。'), mood: 'smug' },
    ],
    evidence: [
      { id: 'dovband', icon: 'bracelet', name: t('Dov’s bracelet', '多夫的手环'), detail: t('Cracked in two. Cheap and mass-produced, like every Axiom bracelet. Anyone can make one from the public instructions.', '裂成了两半。和所有公理手环一样，廉价且批量生产。任何人都能按公开的方法做一只。') },
      { id: 'dockhand', icon: 'bracelet', name: t('A dockhand’s bracelet', '码头工人的手环'), detail: t('Worn in the tavern that night. Five minutes after the bell, it announced that a new test had opened.', '当晚在酒馆里戴着。钟响五分钟后，它公布了一场新试炼的开启。') },
      { id: 'rules', icon: 'book', name: t('The rules of the test', '试炼的规则'), detail: t('Scores are hidden. Each candidate senses only their own progress. All punishments land at once, when there is a winner.', '分数是隐藏的。每位候选者只能感知自己的进度。所有惩罚在出现赢家时一并降临。') },
      { id: 'slip', icon: 'scroll', name: t('The bet slip', '赌约'), detail: t('“Dov breaks the Axiom before the bell.” Signed by 31 patrons.', '“多夫在钟响前破解公理。”有31位酒客签名。') },
    ],
    testimonies: [
      {
        title: t('The night I won', '我赢的那一晚'),
        statements: [
          { id: 'd1', text: t('I bet the room I’d break the Axiom before the bell.', '我跟满屋子的人打赌，说我能在钟响前破解公理。'), press: [
            { who: 'you', text: t('And they took the bet?', '他们接受了？') },
            { who: 'witness', text: t('Thirty-one of them signed. Thirty-one!', '三十一个人签了字。三十一个！'), mood: 'smug' }] },
          { id: 'd2', text: t('When the bell rang, I smashed my bracelet on the bar. Cracked clean in two.', '钟一响，我就把手环往吧台上砸。干脆利落地裂成两半。'), press: [
            { who: 'witness', text: t('Best sound I ever heard.', '那是我听过最美妙的声音。'), mood: 'smug' }] },
          { id: 'd3', contradicts: 'dockhand', text: t('And at that moment, every bracelet in the tavern went dark.', '就在那一刻，酒馆里所有的手环都黑了。'), press: [
            { who: 'you', text: t('Every one?', '每一只？') },
            { who: 'witness', text: t('Dead and dark. Everyone knows breaking the Axiom makes everything stop.', '全灭了，一片漆黑。谁都知道，破解公理会让一切停止。'), mood: 'calm' }] },
          { id: 'd4', text: t('That’s what breaking the Axiom looks like. I won.', '这就是破解公理的样子。我赢了。'), press: [
            { who: 'witness', text: t('Thirty-one people owe me money, and the Law of All Laws is mine.', '三十一个人欠我钱，万法之法也归我了。'), mood: 'smug' }] },
        ],
        wrong: [t('Wrong pocket, advocate.', '掏错口袋了吧，辩护人。'), t('If that proves anything, it proves I’m right.', '这要是能证明什么，也是证明我是对的。')],
        breakthrough: [
          { who: 'you', text: t('Five minutes after the bell, this bracelet announced a new test. It was working fine.', '钟响五分钟后，这只手环公布了一场新试炼。它好好地运转着。') },
          { who: 'witness', text: t('All right, all right! The others kept working. But mine broke, didn’t it? That still counts.', '好吧好吧！别人的都还亮着。可我的确实碎了，对吧？那也算数。'), mood: 'nervous' },
        ],
      },
      {
        title: t('Why it still counts', '为什么仍然算数'),
        statements: [
          { id: 'e1', text: t('The test is breaking the Axiom, and every bracelet is the Axiom.', '试炼的内容是破解公理，而每只手环都是公理。'), press: [
            { who: 'witness', text: t('Same instructions, same Axiom. Obviously.', '同样的方法，同一个公理。显而易见。'), mood: 'calm' }] },
          { id: 'e2', reveals: 'e3', text: t('So when I broke mine, I broke a piece of it.', '所以我砸碎我的手环，就是砸碎了它的一部分。'), press: [
            { who: 'you', text: t('And then what happened?', '然后呢？') },
            { who: 'witness', text: t('Then I felt it. Clear as anything.', '然后我感觉到了。清清楚楚。'), mood: 'smug' }] },
          { id: 'e3', hidden: true, contradicts: 'rules', text: t('I felt my progress shoot past everyone else’s.', '我感觉到自己的进度一下子超过了所有人。'), press: [
            { who: 'witness', text: t('Past all of them. I just knew.', '把他们全甩在后面。我就是知道。'), mood: 'smug' }] },
          { id: 'e4', text: t('So I’m in the lead, and the leader wins.', '所以我领先了，而领先者获胜。'), press: [
            { who: 'witness', text: t('Look it up.', '不信你去查。'), mood: 'calm' }] },
        ],
        wrong: [t('Is that supposed to scare me?', '你是想吓唬我吗？'), t('Nice try.', '想得美。')],
        breakthrough: [
          { who: 'you', text: t('Scores are hidden. You can only sense your own progress. You couldn’t have felt yourself pass anyone.', '分数是隐藏的。你只能感知自己的进度。你不可能感觉到自己超过了谁。') },
          { who: 'witness', text: t('…I felt my bracelet break. That’s all I felt.', '……我只感觉到手环碎了。别的什么也没感觉到。'), mood: 'broken' },
        ],
      },
    ],
    resolution: [
      { who: 'magistrate', text: t('The bet is void. The tavern keeps its money.', '赌约无效。酒馆的钱不必付。') },
      { who: 'narrator', text: t('Dov broke a bracelet, not the Axiom. The Law of All Laws stays vacant, and everyone’s points, ever, are still 0.', '多夫砸碎的只是一只手环，而不是公理。万法之法依然空缺，所有人的历史得分仍然是0。') },
      { who: 'cat', text: t('The cat yawns.', '猫打了个哈欠。') },
    ],
  },
  {
    id: 'saltgate-healer',
    title: t('The healer of Saltgate', '盐门的医者'),
    witness: { name: t('Kasim', '卡西姆'), role: t('Dealer in unicorn horn', '独角兽角商人'), mask: 'horn' },
    intro: [
      { who: 'narrator', text: t('Kasim sells unicorn horn powder. A healer named Wen keeps telling his customers it’s fake, so Kasim has taken her to court for ruining his trade.', '卡西姆专卖独角兽角粉。一位名叫温的医者总对他的顾客说那是假货，于是卡西姆以毁坏生意为由把她告上了法庭。') },
      { who: 'magistrate', text: t('If the powder is genuine, Wen owes him damages. Witness, proceed.', '如果角粉是真的，温就得赔偿他的损失。证人，请陈述。') },
      { who: 'witness', text: t('With pleasure. I’ll be brief: my horn works.', '荣幸之至。我长话短说：我的角有效。'), mood: 'smug' },
    ],
    evidence: [
      { id: 'unicorns', icon: 'book', name: t('Creatures: unicorns', '神兽：独角兽'), detail: t('A dead unicorn’s horn is only bone: its power returned to the world when it died. Living unicorns can take human form, and many live among mortals as healers.', '死去独角兽的角不过是骨头：它的力量在它死去时已回归世界。活着的独角兽可以化为人形，许多以医者的身份生活在凡人之中。') },
      { id: 'pouch', icon: 'pouch', name: t('A pouch of powder', '一袋角粉'), detail: t('Bought from Kasim’s stall. White and chalky, and it smells faintly of bone.', '从卡西姆的摊位买来。白色，粉笔一样，隐约有股骨头味。') },
      { id: 'register', icon: 'scroll', name: t('Saltgate clinic register', '盐门诊所登记簿'), detail: t('The evening Tam bought the pouch: “Tam, net-hook cut, left hand. Closed it. No charge.” Signed: Wen.', '塔姆买下那袋角粉的当晚：“塔姆，渔钩划伤，左手。已缝合。免费。”签名：温。') },
      { id: 'certificate', icon: 'seal', name: t('Kasim’s certificate', '卡西姆的证书'), detail: t('“Genuine horn, taken in the Great Hunt.” The seal is Kasim’s own.', '“正宗独角兽角，取自大狩猎。”盖的是卡西姆自己的印。') },
    ],
    testimonies: [
      {
        title: t('The genuine article', '货真价实'),
        statements: [
          { id: 'k1', text: t('My horn comes from a unicorn taken in the Great Hunt.', '我的角来自大狩猎中被猎杀的一头独角兽。'), press: [
            { who: 'witness', text: t('An heirloom. My great-great-grandfather’s grandfather was there.', '祖传之物。我曾曾祖父的祖父亲历过那场狩猎。'), mood: 'smug' }] },
          { id: 'k2', contradicts: 'unicorns', text: t('Its power is still inside. Hold it and you can feel it humming.', '它的力量还在里面。握在手里，你能感觉到它在嗡嗡作响。'), press: [
            { who: 'you', text: t('Humming?', '嗡嗡作响？') },
            { who: 'witness', text: t('Distinctly. Like a kettle just before it boils.', '清清楚楚。就像水快开时的壶。'), mood: 'calm' }] },
          { id: 'k3', text: t('I grind a pinch into every pouch I sell.', '我卖出的每一袋里，都磨进了一小撮。'), press: [
            { who: 'witness', text: t('Very generous of me, really.', '说真的，我已经很大方了。'), mood: 'smug' }] },
          { id: 'k4', text: t('And this healer, Wen, tells my customers it’s fake.', '可这个医者温，却对我的顾客说那是假的。'), press: [
            { who: 'witness', text: t('Bad for business. Very bad.', '影响生意。非常影响。'), mood: 'nervous' }] },
        ],
        wrong: [t('My certificate says otherwise.', '我的证书可不是这么说的。'), t('Irrelevant, surely.', '这无关紧要吧。')],
        breakthrough: [
          { who: 'you', text: t('A dead unicorn’s horn is only bone. Its power went back to the world. There is nothing left in it to hum.', '死去独角兽的角不过是骨头。它的力量早已回归世界。里面没有任何东西能嗡嗡作响。') },
          { who: 'witness', text: t('…The humming might be my ears. But people still get better! I have proof!', '……嗡嗡声也许是我耳鸣。可人们确实好了！我有证据！'), mood: 'nervous' },
        ],
      },
      {
        title: t('The proof', '证据'),
        statements: [
          { id: 'm1', text: t('Old Tam cut his hand on a net hook. Deep.', '老塔姆的手被渔钩划了。很深。'), press: [
            { who: 'witness', text: t('Bled all over my stall.', '血流得我摊子上到处都是。'), mood: 'calm' }] },
          { id: 'm2', text: t('I sold him a pouch, and by the next morning the cut had closed.', '我卖给他一袋，到第二天早上，伤口就愈合了。'), press: [
            { who: 'witness', text: t('Overnight! A miracle, and a bargain.', '一夜之间！既是奇迹，又物美价廉。'), mood: 'smug' }] },
          { id: 'm3', contradicts: 'register', text: t('Nobody else touched that hand. Just my powder.', '除了我的角粉，没有人碰过那只手。'), press: [
            { who: 'you', text: t('You’re certain?', '你确定？') },
            { who: 'witness', text: t('He went straight home. I watched him go.', '他直接回家了。我亲眼看着他走的。'), mood: 'calm' }] },
          { id: 'm4', text: t('So my horn works, and Wen owes me.', '所以我的角有效，温欠我的。'), press: [
            { who: 'witness', text: t('Shall we say a hundred silver?', '就算一百银币吧？'), mood: 'smug' }] },
        ],
        wrong: [t('You’re grasping, advocate.', '辩护人，你这是病急乱投医。'), t('That proves nothing.', '这什么也证明不了。')],
        breakthrough: [
          { who: 'you', text: t('The clinic register. The evening he bought your pouch, Wen closed Tam’s cut herself, for free.', '诊所的登记簿。就在他买下你那袋角粉的当晚，是温亲手为塔姆缝合了伤口，分文未取。') },
          { who: 'witness', text: t('Closed it? With what? There isn’t a horn in her whole clinic!', '缝合？用什么？她整个诊所连一根角都没有！'), mood: 'broken' },
        ],
      },
    ],
    resolution: [
      { who: 'you', text: t('She doesn’t need one.', '她不需要角。') },
      { who: 'narrator', text: t('Anyone who looks closely can tell. Wen looks human, but she isn’t: she is a unicorn in human form, one of many who live among mortals as healers. The horn on Kasim’s stall was only ever bone.', '只要仔细看，任何人都能看出来。温看起来像人，但她不是：她是一头化为人形的独角兽，许多独角兽都以医者的身份生活在凡人之中。卡西姆摊位上的那根角，从来都只是骨头。') },
      { who: 'magistrate', text: t('Case dismissed. Kasim will stop selling the powder.', '驳回起诉。卡西姆不得再出售角粉。') },
      { who: 'narrator', text: t('In the back row, the old man tucks his cat under his arm and leaves. Nobody notices him go.', '后排的老人把猫夹在胳膊下，起身离开。没有人注意到他走了。') },
    ],
  },
];
