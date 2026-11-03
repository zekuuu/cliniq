/**
 * Starter list for the Allergies and Medical conditions fields (review round 2, R16). Edit freely.
 *
 * Each entry is the standard English name that is stored when it is picked, with Filipino words the
 * nurse may type to find it. Short and obvious on purpose: names only, no medical facts. Anything not
 * on this list can still be typed by hand, and the form marks it as typed by hand.
 */
export interface StarterEntry {
  name: string
  aliases: string[]
}

export const STARTER_ALLERGIES: StarterEntry[] = [
  { name: 'Shrimp', aliases: ['hipon'] },
  { name: 'Crab', aliases: ['alimango', 'alimasag'] },
  { name: 'Peanut', aliases: ['mani'] },
  { name: 'Egg', aliases: ['itlog'] },
  { name: 'Milk', aliases: ['gatas'] },
  { name: 'Fish', aliases: ['isda'] },
  { name: 'Wheat', aliases: ['trigo'] },
  { name: 'Soy', aliases: [] },
  { name: 'Dust', aliases: ['alikabok'] },
  { name: 'Penicillin', aliases: [] },
]

export const STARTER_CONDITIONS: StarterEntry[] = [
  { name: 'Asthma', aliases: ['hika'] },
  { name: 'Hypertension', aliases: ['alta presyon', 'high blood'] },
  { name: 'Heart condition', aliases: ['sakit sa puso'] },
  { name: 'Diabetes', aliases: [] },
  { name: 'Epilepsy', aliases: [] },
]
