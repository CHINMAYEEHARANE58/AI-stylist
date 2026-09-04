export async function getWeatherStylingContext(city = "Mumbai") {
  return {
    city,
    temperature: 29,
    condition: "Humid",
    stylingNote: "Prioritize breathable fabrics and lighter layers.",
  };
}

