import { expect,test } from "@playwright/test";
import { assetFeedFixture } from "../fixtures/assets";
import type { BrowseMarket,BrowseRange } from "../../lib/assets/types";
import { completeFixture } from "../fixtures/discover";

test("Stocks switches US/Singapore, searches, changes chart ranges and preserves a Discover selection", async ({page})=>{
  await page.route("**/api/assets?*",route=>{
    const params=new URL(route.request().url()).searchParams;
    return route.fulfill({json:assetFeedFixture(params.get("market") as BrowseMarket,params.get("range") as BrowseRange)});
  });
  await page.setViewportSize({width:390,height:844});
  await page.goto("/stocks");
  await expect(page.getByRole("heading",{name:"Stocks",exact:true})).toBeVisible();
  await expect(page.getByRole("article",{name:"NVIDIA",exact:true}).getByRole("img")).toBeVisible();
  await page.getByRole("radio",{name:"Singapore",exact:true}).check();
  await expect(page.getByRole("article",{name:"DBS",exact:true})).toBeVisible();
  await expect(page.getByRole("article",{name:"NVIDIA",exact:true})).toHaveCount(0);
  await page.getByRole("radio",{name:"1Y",exact:true}).check();
  await expect(page.getByRole("article",{name:"DBS",exact:true}).getByRole("img")).toBeVisible();
  await page.getByRole("searchbox",{name:"Search these assets"}).fill("D05");
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Use in Discover"}).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("radio",{name:"Stocks",exact:true})).toBeChecked();
  await expect(page.getByRole("radio",{name:"Singapore",exact:true})).toBeChecked();
  await expect(page.getByRole("textbox",{name:/Additional preferences/})).toHaveValue(/DBS/);
});

test("Stocks errors remain recoverable and never show invented prices",async({page})=>{
  await page.route("**/api/assets?*",route=>route.fulfill({status:503,json:{message:"Synthetic feed unavailable."}}));
  await page.goto("/stocks");
  await expect(page.getByRole("heading",{name:"Market data is unavailable."})).toBeVisible();
  await expect(page.getByRole("button",{name:"Try again"})).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("mixed Discover submits the selected markets and renders USD stock budgets with explanations",async({page})=>{
  await page.route("**/api/allocation",async route=>{
    expect(route.request().postDataJSON()).toMatchObject({assetClass:"both",stockMarket:"both",budgetCents:100000});
    const result=completeFixture();
    const ids=["bitcoin","stock:sg:D05","stock:us:NVDA"];
    result.allocations.forEach((asset,i)=>{asset.assetId=ids[i];asset.name=["Bitcoin","DBS","NVIDIA"][i];asset.symbol=["BTC","D05","NVDA"][i];asset.evidence=[{title:"Synthetic supporting source",url:"https://example.test/source",observedAt:result.generatedAt}];});
    result.marketObservations=ids.map((assetId,i)=>({assetId,assetClass:i?"stock":"crypto",observedAt:result.generatedAt}));
    await route.fulfill({json:result});
  });
  await page.goto("/");
  await page.getByRole("radio",{name:"Crypto + stocks",exact:true}).check();
  await page.getByRole("textbox",{name:"Amount to allocate (required)",exact:true}).fill("1000");
  await page.getByRole("radio",{name:"3–5 years",exact:true}).check();
  await page.getByRole("radio",{name:"No",exact:true}).check();
  await page.getByRole("radio",{name:"Hold and reassess",exact:true}).check();
  await page.getByRole("radio",{name:"Basic",exact:true}).check();
  await page.getByRole("group",{name:/What investments do you already hold/}).getByRole("radio",{name:"None",exact:true}).check();
  await page.getByRole("button",{name:"Generate allocation",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Your allocation proposal"})).toBeVisible();
  await expect(page.getByText("D05 · Singapore stock",{exact:true})).toBeVisible();
  await expect(page.getByText("NVDA · US stock",{exact:true})).toBeVisible();
  await expect(page.getByText(/All allocation amounts are USD budgets/)).toBeVisible();
  await expect(page.getByText("100% of your entered budget")).toBeVisible();
});
