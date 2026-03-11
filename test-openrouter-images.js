async function test() {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  const data = await res.json();
  const freeModels = data.data.filter(m => m.pricing.prompt === "0" && m.pricing.completion === "0");
  const imageModels = freeModels.filter(m => m.architecture?.modality?.includes("image") || m.description?.toLowerCase().includes("image"));
  console.log("Free image models:", imageModels.map(m => m.id));
}
test();
