import { createFileRoute } from "@tanstack/react-router";
import { Landmark, Users, BookOpen, Music2, HeartHandshake, Globe2, Home } from "lucide-react";

import gourdsImg from "@/assets/heritage/gourds.jpeg";
import womenImg from "@/assets/heritage/women.jpeg";
import groupImg from "@/assets/heritage/group.jpeg";
import menHatsImg from "@/assets/heritage/men-hats.jpeg";
import danceImg from "@/assets/heritage/dance.jpeg";
import clappingImg from "@/assets/heritage/clapping.jpeg";

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
  image,
  imageAlt,
  imageSide = "right",
  children,
}: {
  icon: typeof Landmark;
  title: string;
  image?: string;
  imageAlt?: string;
  imageSide?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white overflow-hidden shadow-sm">
      <div className={`grid gap-0 ${image ? "md:grid-cols-2" : ""}`}>
        {image && imageSide === "left" && (
          <div className="relative h-64 md:h-auto min-h-[280px]">
            <img src={image} alt={imageAlt ?? title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent md:to-white" />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          </div>
          <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed">
            {children}
          </div>
        </div>
        {image && imageSide === "right" && (
          <div className="relative h-64 md:h-auto min-h-[280px] order-first md:order-last">
            <img src={image} alt={imageAlt ?? title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-transparent to-white md:to-white" />
          </div>
        )}
      </div>
    </section>
  );
}

function HeritagePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="relative overflow-hidden rounded-3xl border shadow-lg">
        <img
          src={groupImg}
          alt="Banyamulenge community in traditional attire"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-primary/70" />
        <div className="relative p-8 sm:p-14 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
            Our Heritage
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight max-w-3xl drop-shadow">
            The living history of the Banyamulenge
          </h1>
          <p className="mt-4 text-white/90 max-w-2xl text-sm sm:text-base">
            A people of the Mulenge highlands — pastoralists, storytellers and custodians of a
            rich oral tradition spanning centuries and continents.
          </p>
        </div>
      </header>

      <Section icon={Landmark} title="Introduction" image={gourdsImg} imageAlt="Women in traditional Banyamulenge attire with ceremonial gourds" imageSide="right">
        <p>
          The <strong>Banyamulenge</strong> are a Kinyarwanda-speaking community living
          predominantly on the <strong>Mulenge Highlands</strong> of South Kivu Province in the
          eastern Democratic Republic of Congo (DRC). The name Banyamulenge literally means
          <em> "the people of Mulenge."</em>
        </p>
        <p>
          Although they share linguistic and cultural similarities with populations found in
          present-day Rwanda and Burundi, the Banyamulenge have developed a distinct historical
          identity through centuries of settlement in the high plateaus of South Kivu.
        </p>
      </Section>

      <Section icon={Globe2} title="Historical Origins" image={menHatsImg} imageAlt="Elders in traditional hats and coats" imageSide="left">
        <p>
          According to Banyamulenge oral traditions and numerous historical studies, ancestors of
          the Banyamulenge migrated into the highlands of present-day South Kivu between the
          <strong> 17th and 19th centuries</strong>, with several migration waves.
        </p>
        <ul>
          <li>Search for fertile grazing lands</li>
          <li>Expansion of cattle keeping</li>
          <li>Political changes in neighboring kingdoms</li>
          <li>Trade opportunities</li>
        </ul>
      </Section>

      <Section icon={Home} title="Traditional Economy & Leadership" image={clappingImg} imageAlt="Community members clapping in unison" imageSide="right">
        <p>
          Historically the Banyamulenge were renowned <strong>pastoralists</strong>. Cattle
          represented wealth, prestige, family heritage, marriage negotiations and community
          status. They also practiced agriculture, milk production, local trade, leather
          craftsmanship and iron exchange.
        </p>
        <p>
          Leadership was based on respected elders, lineage heads and customary mediators.
          Decisions were reached through consultation rather than centralized kingship.
        </p>
      </Section>

      <Section icon={BookOpen} title="Language, Religion & Values" image={womenImg} imageAlt="Women in vibrant patterned dresses" imageSide="left">
        <p>
          The primary language is <strong>Kinyamulenge</strong>, a local variety of
          Kinyarwanda. Many also speak Swahili, French, Lingala and English.
        </p>
        <p>
          Traditional beliefs centred on ancestors and Imana (God). Cultural values emphasize
          honesty, respect, hospitality, courage, humility, family unity, hard work and
          peaceful coexistence.
        </p>
      </Section>

      <Section icon={Music2} title="Music, Marriage & Dress" image={danceImg} imageAlt="Traditional dance performance" imageSide="right">
        <p>
          Marriage traditionally involved negotiations between families, exchange of cattle as
          bride wealth, blessings by elders and community celebrations of music and dance.
          Traditional music includes praise songs, cattle songs, wedding and warrior songs.
        </p>
        <p>
          Men historically wore animal skins, woven garments and staffs; women wore decorated
          wraps, beads and handmade ornaments.
        </p>
      </Section>

      <Section icon={Users} title="The Banyamulenge Lineages (Imirara)">
        <p>
          Twenty-eight recognized Banyamulenge lineages are remembered in oral tradition.
          These are <em>lineages or clans</em>, not separate tribes.
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
          educators, entrepreneurs, clergy, public servants, students and peacebuilders.
        </p>
      </Section>
    </div>
  );
}
