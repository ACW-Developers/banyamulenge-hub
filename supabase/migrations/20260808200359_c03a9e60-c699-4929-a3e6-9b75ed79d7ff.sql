CREATE TABLE public.museum_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Artifact',
  era text,
  origin text,
  materials text,
  use_description text NOT NULL,
  story text NOT NULL,
  image_url text,
  source_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.museum_artifacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.museum_artifacts TO authenticated;
GRANT ALL ON public.museum_artifacts TO service_role;

ALTER TABLE public.museum_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view artifacts" ON public.museum_artifacts
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert artifacts" ON public.museum_artifacts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update artifacts" ON public.museum_artifacts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete artifacts" ON public.museum_artifacts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER museum_artifacts_updated_at BEFORE UPDATE ON public.museum_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX museum_artifacts_sort_idx ON public.museum_artifacts (sort_order, created_at DESC);

INSERT INTO public.museum_artifacts (name, category, era, origin, materials, use_description, story, image_url, source_url, sort_order) VALUES
('Igicuba (Milk Gourd)', 'Vessel', 'Pre-colonial to present', 'Mulenge Highlands, South Kivu', 'Carved wood, woven grass fibre, cow-hide bindings',
 'A hand-carved wooden churn and container used to store, ferment and serve fresh cow milk. Milk from the family herd is poured in each evening, and the gourd is rocked to produce ikivuguto, the cultured milk offered to guests.',
 'For a pastoral people, the milk gourd is the heart of the household. It is traditionally kept in the cleanest corner of the home, handled with washed hands, and never left empty when a visitor is expected. Elders say that offering a stranger milk from the igicuba is the oldest Banyamulenge promise of peace: whoever drinks from your gourd cannot be your enemy that night. Gourds were passed from mother to daughter at marriage, carrying the family''s name with them.',
 'https://upload.wikimedia.org/wikipedia/commons/1/13/Rwanda_-_Milk_pot_-_Google_Art_Project.jpg',
 'https://commons.wikimedia.org/wiki/File:Rwanda_-_Milk_pot_-_Google_Art_Project.jpg', 1),
('Inka y''Inyambo (Long-Horned Cattle)', 'Living Heritage', 'Centuries-old', 'Great Lakes highlands', 'Living heritage breed',
 'The long-horned Ankole cattle are the foundation of Banyamulenge pastoral life: a source of milk, hides, bride wealth, and the measure of a family''s standing. Herds are moved seasonally across the high plateau pastures of Mulenge.',
 'Every beloved cow is named, praised and sung to. Cattle poetry and praise songs recount the shape of a bull''s horns, the colour of a cow''s coat, and the journeys the herd survived. When families migrated into the Mulenge highlands between the 17th and 19th centuries, it was the search for grazing land that led them; the herd is therefore remembered as both the reason for the journey and the archive of it. Cattle still seal marriages, settle disputes and mark reconciliation between families.',
 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Ankole-Watusi_cattle_Uganda.jpg',
 'https://commons.wikimedia.org/wiki/File:Ankole-Watusi_cattle_Uganda.jpg', 2),
('Inkoko / Agaseke (Woven Basket)', 'Craft', 'Traditional, still made today', 'South Kivu highlands', 'Sisal, papyrus fibre, natural dyes',
 'A tightly coiled basket with a conical lid, woven by women over many days. Used to store grain, beans, salt and small valuables, and given as a formal gift at weddings, births and reconciliations.',
 'The peace basket is a spoken agreement made in fibre. Its tight weave is a lesson in patience, and the pattern a weaver chooses often belongs to her lineage, so a basket can identify the family that made it. When two families negotiate a marriage, gifts travel inside these baskets; when a quarrel ends, a filled basket is carried to the offended household. Nothing valuable is ever handed over uncovered - the lid is part of the respect.',
 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Rwandan_baskets.jpg',
 'https://commons.wikimedia.org/wiki/File:Rwandan_baskets.jpg', 3);