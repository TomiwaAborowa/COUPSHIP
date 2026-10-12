// prisma/seed.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// Scripture quoted from the King James Version (public domain).
const devotionals = [
  {
    dayIndex: 0,
    title: "Better Together",
    scriptureRef: "Ecclesiastes 4:9-10",
    scriptureText:
      "Two are better than one; because they have a good reward for their labour. For if they fall, the one will lift up his fellow: but woe to him that is alone when he falleth; for he hath not another to help him up.",
    body: "God designed marriage as a partnership. When one of you is weary, the other can carry the load for a while. Strength in a marriage is not the absence of weakness, but the presence of someone ready to lift you up.",
    prayerPrompt:
      "Thank God for your spouse and ask Him to make you quick to notice when they need lifting up.",
    discussionQuestion:
      "When was a time your spouse helped you up when you had fallen? How can I support you better this week?",
  },
  {
    dayIndex: 1,
    title: "Love Is Patient",
    scriptureRef: "1 Corinthians 13:4-5",
    scriptureText:
      "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil;",
    body: "Love is described here less as a feeling and more as a set of choices: patience, kindness, humility. Each day offers small moments to choose love in the way we speak, wait and respond to each other.",
    prayerPrompt:
      "Ask God to grow patience and kindness in you, especially in the moments you are most easily provoked.",
    discussionQuestion:
      "Which part of this description of love comes most naturally to you, and which is hardest?",
  },
  {
    dayIndex: 2,
    title: "Bound in Peace",
    scriptureRef: "Ephesians 4:2-3",
    scriptureText:
      "With all lowliness and meekness, with longsuffering, forbearing one another in love; Endeavouring to keep the unity of the Spirit in the bond of peace.",
    body: "Unity takes effort. Paul calls us to endeavour, to work at keeping peace. Humility and gentleness are the tools that protect the bond between you when disagreements come.",
    prayerPrompt:
      "Pray for humility and gentleness in your conversations, and for peace to guard your home.",
    discussionQuestion:
      "What usually helps us find our way back to peace after a disagreement?",
  },
  {
    dayIndex: 3,
    title: "Forgive as You Were Forgiven",
    scriptureRef: "Colossians 3:13-14",
    scriptureText:
      "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye. And above all these things put on charity, which is the bond of perfectness.",
    body: "Forgiveness is not pretending a hurt didn't happen; it is choosing to release the debt, just as Christ released ours. Love is the garment we put on over everything else, holding it all together.",
    prayerPrompt:
      "Bring any lingering hurt before God and ask for the grace to forgive fully.",
    discussionQuestion:
      "Is there anything small we have let build up that we should talk through and forgive?",
  },
  {
    dayIndex: 4,
    title: "A Threefold Cord",
    scriptureRef: "Ecclesiastes 4:12",
    scriptureText:
      "And if one prevail against him, two shall withstand him; and a threefold cord is not quickly broken.",
    body: "Two strands are strong, but three are stronger still. A marriage woven together with God at its centre has a strength that pressure and hardship cannot easily break.",
    prayerPrompt:
      "Invite God to be the third strand in your marriage, at the centre of your plans and decisions.",
    discussionQuestion:
      "What is one habit we could start to keep God at the centre of our relationship?",
  },
  {
    dayIndex: 5,
    title: "Others First",
    scriptureRef: "Philippians 2:3-4",
    scriptureText:
      "Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves. Look not every man on his own things, but every man also on the things of others.",
    body: "Marriage flourishes when both people look out for each other's interests. Serving your spouse is not losing yourself; it is reflecting the humble, serving heart of Christ.",
    prayerPrompt:
      "Ask God to show you one specific way to put your spouse's needs before your own today.",
    discussionQuestion:
      "What is something I could do this week that would make you feel cared for?",
  },
  {
    dayIndex: 6,
    title: "Trust and Direction",
    scriptureRef: "Proverbs 3:5-6",
    scriptureText:
      "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
    body: "Couples face many decisions: finances, family, work, the future. This verse invites you to bring them all to God together, trusting that He will guide the path you walk side by side.",
    prayerPrompt:
      "Lay your upcoming decisions before God together and ask for His direction.",
    discussionQuestion:
      "What decision ahead of us do we most need to trust God with right now?",
  },
];

async function main() {
  for (const devotional of devotionals) {
    await db.devotional.upsert({
      where: { dayIndex: devotional.dayIndex },
      update: devotional,
      create: devotional,
    });
  }
  console.log(`Seeded ${devotionals.length} devotionals.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
