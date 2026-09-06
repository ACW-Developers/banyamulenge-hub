import { createFileRoute } from "@tanstack/react-router";
import { Landmark, Users, BookOpen, Music2, HeartHandshake, Globe2, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

import gourdsImg from "@/assets/heritage/gourds.jpeg";
import womenImg from "@/assets/heritage/women.jpeg";
import groupImg from "@/assets/heritage/group.jpeg";
import menHatsImg from "@/assets/heritage/men-hats.jpeg";
import danceImg from "@/assets/heritage/dance.jpeg";
import clappingImg from "@/assets/heritage/clapping.jpeg";

export const Route = createFileRoute("/_app/heritage")({
  head: () => ({
    meta: [
      { title: "Our Heritage - Banyamulenge Community" },
      {
        name: "description",
        content: "The history, culture, lineages and traditions of the Banyamulenge people.",
      },
      { property: "og:title", content: "Our Heritage - Banyamulenge Community" },
      {
        property: "og:description",
        content: "History, culture and lineages of the Banyamulenge people.",
      },
    ],
  }),
  component: HeritagePage,
});

const LINEAGE_NAMES = [
  "Abagorora","Abasinzira","Abega","Abasita","Abasegege","Abanyabzinshi","Abasama","Abitira",
  "Abahondogo","Abazigaba","Abadasomera","Abahima","Abadahugwa","Abazoza","Abasinga","Abapfurika",
  "Abashonga","Abahinda","Abatura","Abatakure","Abahiga","Ababano","Abagabika","Abadinzi",
  "Abongera","Abanyakarama","Abaheto","Abatwari",
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
            <img
              src={image}
              alt={imageAlt ?? title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 " />
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
            <img
              src={image}
              alt={imageAlt ?? title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 " />
          </div>
        )}
      </div>
    </section>
  );
}

function HeritagePage() {
  const { t } = useI18n();
  const LINEAGES = LINEAGE_NAMES.map((name, i) => [name, t(`heritage.lineage.${i + 1}`)] as const);
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          {t("heritage.title")}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-500">
          {t("heritage.subtitle")}
        </p>
      </div>
      <header className="relative overflow-hidden rounded-3xl border h-80 shadow-lg">
        <img
          src={groupImg}
          alt={t("heritage.hero.imageAlt")}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-black/35 to-transparent" />
        <div className="relative p-8 mt-48 sm:p-14 text-white">
          <h1 className="text-3xl sm:text-3xl font-black leading-tight max-w-3xl drop-shadow">
            {t("heritage.hero.title")}
          </h1>
        </div>
      </header>

      <Section
        icon={Landmark}
        title={t("heritage.intro.title")}
        image={gourdsImg}
        imageAlt={t("heritage.intro.imageAlt")}
        imageSide="right"
      >
        <p dangerouslySetInnerHTML={{ __html: t("heritage.intro.p1") }} />
        <p dangerouslySetInnerHTML={{ __html: t("heritage.intro.p2") }} />
      </Section>

      <Section
        icon={Globe2}
        title={t("heritage.origins.title")}
        image={menHatsImg}
        imageAlt={t("heritage.origins.imageAlt")}
        imageSide="left"
      >
        <p dangerouslySetInnerHTML={{ __html: t("heritage.origins.p1") }} />
        <ul>
          <li>{t("heritage.origins.list1")}</li>
          <li>{t("heritage.origins.list2")}</li>
          <li>{t("heritage.origins.list3")}</li>
          <li>{t("heritage.origins.list4")}</li>
        </ul>
      </Section>

      <Section
        icon={Home}
        title={t("heritage.economy.title")}
        image={clappingImg}
        imageAlt={t("heritage.economy.imageAlt")}
        imageSide="right"
      >
        <p dangerouslySetInnerHTML={{ __html: t("heritage.economy.p1") }} />
        <p dangerouslySetInnerHTML={{ __html: t("heritage.economy.p2") }} />
      </Section>

      <Section
        icon={BookOpen}
        title={t("heritage.language.title")}
        image={womenImg}
        imageAlt={t("heritage.language.imageAlt")}
        imageSide="left"
      >
        <p dangerouslySetInnerHTML={{ __html: t("heritage.language.p1") }} />
        <p dangerouslySetInnerHTML={{ __html: t("heritage.language.p2") }} />
      </Section>

      <Section
        icon={Music2}
        title={t("heritage.culture.title")}
        image={danceImg}
        imageAlt={t("heritage.culture.imageAlt")}
        imageSide="right"
      >
        <p dangerouslySetInnerHTML={{ __html: t("heritage.culture.p1") }} />
        <p dangerouslySetInnerHTML={{ __html: t("heritage.culture.p2") }} />
      </Section>

      <Section icon={Users} title={t("heritage.lineages.title")}>
        <p dangerouslySetInnerHTML={{ __html: t("heritage.lineages.p1") }} />
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

      <Section icon={HeartHandshake} title={t("heritage.hospitality.title")}>
        <p dangerouslySetInnerHTML={{ __html: t("heritage.hospitality.p1") }} />
        <p dangerouslySetInnerHTML={{ __html: t("heritage.hospitality.p2") }} />
      </Section>
    </div>
  );
}
