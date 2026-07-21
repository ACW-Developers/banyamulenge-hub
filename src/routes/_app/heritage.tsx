import { createFileRoute } from "@tanstack/react-router";
import { Landmark, Users, BookOpen, Music2, HeartHandshake, Globe2, Home, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/heritage")({
  head: () => ({
    meta: [
      { title: "Our Heritage — Banyamulenge Community" },
      { name: "description", content: "The history, culture, lineages and traditions of the Banyamulenge people." },
      { property: "og:title", content: "Our Heritage — Banyamulenge Community" },
      { property: "og:description", content: "History, culture and lineages of the Banyamulenge people." },
    ],
  }),
  component: HeritagePage,
});

const LINEAGES = [
  ["Abagorora", "Elders and mediators in community affairs."],
  ["Abasinzira", "Resilience and preservers of family genealogies."],
  ["Abega", "Ancestral cattle keepers and community leaders."],
  ["Abasita", "Livestock management and family cohesion."],
  ["Abasegege", "Adaptability and plateau settlement."],
  ["Abanyabzinshi", "Large extended family networks."],
  ["Abasama", "Pastoral livelihoods and cooperation."],
  ["Abitira", "Courage and endurance during migrations."],
  ["Abahondogo", "Livestock and family customs."],
  ["Abazigaba", "Respected family heads and local leadership."],
  ["Abadasomera", "Wisdom, counsel and mediation."],
  ["Abahima", "Cattle-herding traditions of the Great Lakes."],
  ["Abadahugwa", "Perseverance and lineage identity."],
  ["Abazoza", "Family solidarity and community participation."],
  ["Abasinga", "Bravery and responsibility."],
  ["Abapfurika", "Migration history across the plateau."],
  ["Abashonga", "Agricultural support alongside cattle keeping."],
  ["Abahinda", "Leadership roles in local communities."],
  ["Abatura", "Pastoral settlement and livestock."],
  ["Abatakure", "Custodians of family traditions."],
  ["Abahiga", "Hunting knowledge before pastoralism."],
  ["Ababano", "Cooperation and family organization."],
  ["Abagabika", "Household leadership and service."],
  ["Abadinzi", "Protection of family interests and communal security."],
  ["Abongera", "Expansion of settlements."],
  ["Abanyakarama", "Prominent ancestral families and cultural continuity."],
  ["Abaheto", "Customary values and inter-family relationships."],
  ["Abatwari", "Courage, leadership and community service."],
];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Landmark;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      </div>
      <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function HeritagePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary via-primary/90 to-amber-600 text-white p-8 sm:p-12 shadow-lg">
        <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-amber-300/20 blur-xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Our Heritage
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight max-w-3xl">
            The living history of the Banyamulenge
          </h1>
          <p className="mt-4 text-white/90 max-w-2xl text-sm sm:text-base">
            A people of the Mulenge highlands — pastoralists, storytellers and custodians of a
            rich oral tradition spanning centuries and continents.
          </p>
        </div>
      </header>

      <Section icon={Landmark} title="Introduction">
        <p>
          The <strong>Banyamulenge</strong> are a Kinyarwanda-speaking community living
          predominantly on the <strong>Mulenge Highlands</strong> of South Kivu Province in the
          eastern Democratic Republic of Congo (DRC). The name Banyamulenge literally means
          <em> "the people of Mulenge."</em>
        </p>
        <p>
          Although they share linguistic and cultural similarities with populations found in
          present-day Rwanda and Burundi, the Banyamulenge have developed a distinct historical
          identity through centuries of settlement in the high plateaus of South Kivu. Over
          generations, they established their own social institutions, cattle culture, clan
          relationships and traditions unique to the Congo.
        </p>
      </Section>

      <Section icon={Globe2} title="Historical Origins">
        <p>
          According to Banyamulenge oral traditions and numerous historical studies, ancestors of
          the Banyamulenge migrated into the highlands of present-day South Kivu between the
          <strong> 17th and 19th centuries</strong>, with several migration waves over different periods.
        </p>
        <ul>
          <li>Search for fertile grazing lands</li>
          <li>Expansion of cattle keeping</li>
          <li>Population growth</li>
          <li>Political changes in neighboring kingdoms</li>
          <li>Trade opportunities</li>
        </ul>
        <p>
          Neighboring peoples included the Bafuliiru, Bavira, Babembe, Barega and Banyindu.
        </p>
      </Section>

      <Section icon={Home} title="Traditional Economy & Leadership">
        <p>
          Historically the Banyamulenge were renowned <strong>pastoralists</strong>. Cattle
          represented wealth, prestige, family heritage, marriage negotiations and community
          status. They also practiced agriculture, milk production, local trade, leather
          craftsmanship and iron exchange.
        </p>
        <p>
          Leadership was based on respected elders, lineage heads, family councils and
          customary mediators. Community decisions were reached through consultation rather
          than centralized kingship — a tradition still deeply respected today.
        </p>
      </Section>

      <Section icon={BookOpen} title="Language, Religion & Values">
        <p>
          The primary language is <strong>Kinyamulenge</strong>, a local variety of
          Kinyarwanda. Many also speak Swahili, French, Lingala and English.
        </p>
        <p>
          Traditional beliefs centred on ancestors and Imana (God). Today most Banyamulenge are
          Christians — Pentecostal, Protestant, Catholic and Adventist. Cultural values
          emphasize honesty, respect, hospitality, courage, humility, family unity, hard work
          and peaceful coexistence.
        </p>
      </Section>

      <Section icon={Music2} title="Music, Marriage & Dress">
        <p>
          Marriage traditionally involved negotiations between families, exchange of cattle as
          bride wealth, blessings by elders and community celebrations of music and dance.
          Traditional music includes praise songs, cattle songs, wedding and warrior songs, and
          ceremonial dances performed with drums, horns and flutes.
        </p>
        <p>
          Men historically wore animal skins, woven garments and staffs; women wore decorated
          wraps, beads and handmade ornaments. Modern clothing has largely replaced traditional
          attire except during ceremonies.
        </p>
      </Section>

      <Section icon={Users} title="The Banyamulenge Lineages (Imirara)">
        <p>
          Twenty-eight recognized Banyamulenge lineages are remembered in oral tradition.
          These are <em>lineages or clans</em>, not separate tribes — extended ancestral
          families whose precise genealogies vary between elders and local historians.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 not-prose mt-4">
          {LINEAGES.map(([name, note], i) => (
            <div key={name} className="rounded-xl border bg-gray-50/50 p-3 flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{name}</div>
                <div className="text-xs text-gray-500 leading-snug">{note}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={HeartHandshake} title="Hospitality & Modern Banyamulenge">
        <p>
          Hospitality remains a defining characteristic. Guests are welcomed with milk, food,
          conversation and blessings. Elders are custodians of history, wisdom, genealogy and
          customary law.
        </p>
        <p>
          Today Banyamulenge communities live across the DRC, Rwanda, Burundi, Uganda, Kenya,
          Tanzania, Europe, North America and Australia — contributing as professionals,
          educators, entrepreneurs, clergy, public servants, students and peacebuilders. Despite
          displacement from periods of conflict, the community continues to preserve its
          language, family structures and cultural heritage.
        </p>
      </Section>
    </div>
  );
}
