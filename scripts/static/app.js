    const appConfig = window.APP_CONFIG || {};
    const promptBox   = document.querySelector("#prompt");
    const intent      = document.querySelector("#intent");
    const purpose     = document.querySelector("#purpose");
    const listingScope  = document.querySelector("#listing-scope");
    const listingCustom = document.querySelector("#listing-custom");
    const marketScope   = document.querySelector("#market-scope");
    const marketCustom  = document.querySelector("#market-custom");
    const dualCommunities = document.querySelector("#dual-communities");
    const advancedComps = document.querySelector("#advanced-comps");
    const advancedCompsPanel = document.querySelector("#advanced-comps-panel");
    const button      = document.querySelector("#search");
    const clearButton = document.querySelector("#clear-page");
    const quickToggle = document.querySelector("#quick-toggle");
    const quickBar    = document.querySelector("#quick-bar");
    const quickButton = document.querySelector("#quick-query");
    const headerMenuToggle = document.querySelector("#header-menu-toggle");
    const headerMenuPanel = document.querySelector("#header-menu-panel");
    const quickPurpose   = document.querySelector("#quick-purpose");
    const quickBedMin    = document.querySelector("#quick-bed-min");
    const quickBedMax    = document.querySelector("#quick-bed-max");
    const quickPriceMin  = document.querySelector("#quick-price-min");
    const quickPriceMax  = document.querySelector("#quick-price-max");
    const quickCommunity = document.querySelector("#quick-community");
    const quickCategory  = document.querySelector("#quick-category");
    const aiButton       = document.querySelector("#ai-feedback");
    const estimateButton    = document.querySelector("#ai-estimate");
    const estimatePanel     = document.querySelector("#estimate-panel");
    const oppScanSaleBtn    = document.querySelector("#opp-scan-sale");
    const oppScanRentBtn    = document.querySelector("#opp-scan-rent");
    const opportunityPanel  = document.querySelector("#opportunity-panel");
    const aiReportButton = document.querySelector("#ai-report");
    const agentPlanButton = document.querySelector("#agent-plan");
    const clientReportButton = document.querySelector("#client-report");
    const reportActions = document.querySelector(".report-actions");
    const autoBuildReport = document.querySelector("#auto-build-report");
    const scenarioButtons = document.querySelectorAll(".scenario-button");
    const checkButton = document.querySelector("#check-openai");
    const keyBar      = document.querySelector("#key-bar");
    const aiKeyToggle = document.querySelector("#ai-key-toggle");
    const specialToggle = document.querySelector("#special-toggle");
    const helpToggle  = document.querySelector("#help-toggle");
    const helpPanel   = document.querySelector("#help-panel");
    const toolsStrip  = document.querySelector("#tools-strip");
    const introModal  = document.querySelector("#intro-modal");
    const introModalCard = document.querySelector(".intro-modal-card");
    const introModalClose = document.querySelector("#intro-modal-close");
    const introModalPrimary = document.querySelector("#intro-modal-primary");
    const commBtn     = document.querySelector("#comm-btn");
    const commPanel   = document.querySelector("#comm-panel");
    const ownerToggle = document.querySelector("#owner-toggle");
    const ownerDrawer = document.querySelector("#owner-drawer");
    const drawerOverlay = document.querySelector("#drawer-overlay");
    const closeOwnerDrawer = document.querySelector("#close-owner-drawer");
    const ownerButton = document.querySelector("#owner-lookup");
    const tokenBox    = document.querySelector("#openai-token");
    const ownerUrlBox = document.querySelector("#owner-url");
    const summary     = document.querySelector("#summary");
    const aiScenarioNote = document.querySelector("#ai-scenario-note");
    const response    = document.querySelector("#response");
    const aiPanel     = document.querySelector("#ai-panel");
    const reportToolbar = document.querySelector("#report-toolbar");
    const bestShortlistTitle = document.querySelector("#best-shortlist-title");
    const printReportButton  = document.querySelector("#print-report");
    const ownerPanel  = document.querySelector("#owner-panel");
    const guidedDemo = document.querySelector("#guided-demo");
    const guidedDemoText = document.querySelector("#guided-demo-text");
    const guidedDemoClose = document.querySelector("#guided-demo-close");
    const introPanel = document.querySelector(".intro-panel");
    const searchCard = document.querySelector(".search-card");
    const aiRow = document.querySelector(".ai-row");
    const error       = document.querySelector("#error");
    const spinner     = document.querySelector("#spinner");
    const results     = document.querySelector("#results");
    const premiumCompromiseSection = document.querySelector("#premium-compromise-section");
    const premiumCompromiseResults = document.querySelector("#premium-compromise-results");
    const aboveBudgetSection = document.querySelector("#above-budget-section");
    const aboveBudgetResults = document.querySelector("#above-budget-results");
    const fallbackSection    = document.querySelector("#fallback-section");
    const fallbackResults    = document.querySelector("#fallback-results");
    const status      = document.querySelector("#status");
    const demoPromptSelect = document.querySelector("#demo-prompt-select");
    let activeApiKey  = appConfig.serverManagedAi ? "server-managed" : "";
    let lastRankContext = null;
    let lastReportContext = null;
    let lastBuiltReport = null;
    let lastRenderedData = null;
    let lastFindCandidateUrls = [];
    let lastFindPremiumCandidateUrls = [];
    let activeScenario = "";
    let activeFindIntent = "auto";
    let budgetRealityScenarioReady = false;
    let guideDismissed = false;
    let currentWorkflowStep = 0;
    let agentPlanOpened = false;
    let clientReportOpened = false;
    const reportStorageKeys = {
      agent: "propertyDetector.agentPlanHtml",
      client: "propertyDetector.clientReportHtml",
    };

    toolsStrip?.before(helpPanel);

    if (appConfig.publicMode) {
      document.body.classList.add("public-mode");
      ownerToggle.hidden = true;
      ownerDrawer.hidden = true;
      drawerOverlay.hidden = true;
      status.textContent = "Public demo";
    }

    function closeIntroModal() {
      if (!introModal) return;
      introModal.hidden = true;
    }

    function showIntroModal() {
      if (!introModal) return;
      introModal.hidden = false;
      introModalCard?.focus();
    }

    const wfSteps = [1, 2, 3].map(n => document.querySelector(`#wf-${n}`));
    const wf4a = document.querySelector("#wf-4a");  // Agent Plan pill
    const wf4b = document.querySelector("#wf-4b");  // Client Report pill
    function clearGuideFocus() {
      [
        demoPromptSelect,
        promptBox,
        button,
        aiButton,
        aiReportButton,
        agentPlanButton,
        clientReportButton,
        ...scenarioButtons,
      ].forEach((el) => el?.classList.remove("guide-focus"));
    }

    function preferredScenarioButton() {
      const lockedScenario = scenarioForFindIntent(activeFindIntent);
      if (lockedScenario) {
        return Array.from(scenarioButtons).find((btn) => btn.dataset.scenario === lockedScenario && !btn.disabled);
      }
      return Array.from(scenarioButtons).find((btn) => !btn.disabled) || (!aiButton.disabled ? aiButton : null);
    }

    function dockGuide(position) {
      if (!guidedDemo) return;
      if (position === "demo") {
        introPanel?.before(guidedDemo);
      } else if (position === "ai") {
        aiRow?.before(guidedDemo);
      } else {
        searchCard?.before(guidedDemo);
      }
    }

    function setGuide(message, targets = [], position = "search") {
      if (!guidedDemo || guideDismissed) return;
      dockGuide(position);
      guidedDemo.hidden = false;
      guidedDemoText.textContent = message;
      clearGuideFocus();
      (Array.isArray(targets) ? targets : [targets]).forEach((el) => el?.classList.add("guide-focus"));
    }

    function updateGuidedDemo() {
      if (guideDismissed) {
        if (guidedDemo) guidedDemo.hidden = true;
        clearGuideFocus();
        return;
      }
      const hasPrompt = Boolean(promptBox.value.trim());
      if (!hasPrompt) {
        setGuide("New here? Choose a demo prompt, or type your own search brief to begin.", demoPromptSelect, "demo");
      } else if (currentWorkflowStep === 0) {
        setGuide("Good. Press Find to get the current basic snapshot from live listing data.", button, "search");
      } else if (currentWorkflowStep === 1) {
        setGuide("This is the quick snapshot. Pick the highlighted AI scenario to build the full analysis.", preferredScenarioButton(), "ai");
      } else if (currentWorkflowStep === 2) {
        setGuide("Scenario ranking is ready. Build the report to turn the shortlist into market-backed reasoning.", aiReportButton, "ai");
      } else {
        setGuide("Report is ready. Create a client report, an agent plan, or both.", [clientReportButton, agentPlanButton], "ai");
      }
    }
    function setWorkflowStep(doneUpTo) {
      currentWorkflowStep = doneUpTo;
      // Update steps ①②③
      wfSteps.forEach((el, i) => {
        if (!el) return;
        el.classList.remove("done", "active");
        if (i < doneUpTo) el.classList.add("done");
        else if (i === doneUpTo) el.classList.add("active");
      });
      // Button highlights
      promptBox.classList.toggle("prompt-ready", doneUpTo === 0);
      button.classList.toggle("step-ready", doneUpTo === 0);
      scenarioButtons.forEach(btn => btn.classList.toggle("step-ready", doneUpTo === 1));
      aiReportButton.classList.toggle("step-ready", doneUpTo === 2);
      const outputReady = doneUpTo >= 3;
      agentPlanButton.classList.toggle("step-ready", outputReady);
      clientReportButton.classList.toggle("step-ready", outputReady);
      if (reportActions) reportActions.hidden = doneUpTo < 3;
      aiReportButton.hidden = doneUpTo < 2;
      agentPlanButton.hidden = doneUpTo < 3;
      clientReportButton.hidden = doneUpTo < 3;
      agentPlanButton.disabled = false;
      clientReportButton.disabled = false;
      agentPlanButton.textContent = agentPlanOpened ? "Reopen agent plan" : "Agent plan";
      clientReportButton.textContent = clientReportOpened ? "Reopen client report" : "Client report";
      // Output pills ④ — managed independently, reset when going backwards
      if (doneUpTo < 3) {
        [wf4a, wf4b].forEach(el => el?.classList.remove("done", "active"));
        aiReportButton.classList.remove("build-done", "build-failed");
      } else if (doneUpTo === 3) {
        // Build Report done — activate both output pills (unless already completed)
        if (!wf4a?.classList.contains("done")) wf4a?.classList.add("active");
        if (!wf4b?.classList.contains("done")) wf4b?.classList.add("active");
      }
      updateGuidedDemo();
    }

    function setActiveScenario(scenario) {
      activeScenario = scenario || "";
      scenarioButtons.forEach((btn) => {
        btn.classList.toggle("scenario-selected", Boolean(activeScenario) && btn.dataset.scenario === activeScenario);
      });
    }

    function scenarioForFindIntent(findIntent) {
      const scenarioMap = {
        best_value: "best_value",
        budget_reality: "budget_reality",
        negotiation: "negotiation",
        listing_opportunity: "listing_opportunity",
        upgrade_potential: "upgrade_potential",
        move_in_ready: "move_in_ready",
      };
      return scenarioMap[findIntent] || "";
    }

    function setAiScenarioAvailability(findIntent = "auto") {
      activeFindIntent = findIntent || "auto";
      const lockedScenario = scenarioForFindIntent(activeFindIntent);
      const isLocked = Boolean(lockedScenario);
      const hasFindResults = lastFindCandidateUrls.length > 0;

      aiButton.disabled = !hasFindResults || isLocked;
      aiButton.classList.toggle("scenario-locked", aiButton.disabled);
      aiButton.title = !hasFindResults
        ? "Run Find first."
        : isLocked
          ? "This Find intent has a matching scenario. Use the active scenario button."
          : "";

      scenarioButtons.forEach((btn) => {
        const scenario = btn.dataset.scenario;
        const lockedByIntent = isLocked && scenario !== lockedScenario;
        const lockedByFallbackRule = scenario === "fallback" && !budgetRealityScenarioReady;
        const lockedBeforeFind = !hasFindResults;
        const disabled = lockedBeforeFind || lockedByIntent || lockedByFallbackRule;
        btn.disabled = disabled;
        btn.classList.toggle("scenario-locked", disabled);
        if (lockedBeforeFind) {
          btn.title = scenario === "fallback" ? "Run Find first, then Budget reality." : "Run Find first.";
        } else if (scenario === "fallback") {
          btn.title = budgetRealityScenarioReady ? "" : "Run Budget reality first.";
        } else if (lockedByIntent) {
          btn.title = "This Find intent has a matching scenario. Use the active scenario button.";
        } else {
          btn.title = "";
        }
      });
      updateGuidedDemo();
    }

    function resetWorkflowOutput() {
      summary.innerHTML = "";
      aiScenarioNote.hidden = true;
      response.hidden = true;
      response.querySelector("div").textContent = "";
      reportToolbar.hidden = true;
      bestShortlistTitle.hidden = true;
      aiPanel.hidden = true;
      aiPanel.innerHTML = "";
      estimatePanel.hidden = true;
      estimatePanel.innerHTML = "";
      opportunityPanel.hidden = true;
      opportunityPanel.innerHTML = "";
      error.hidden = true;
      error.textContent = "";
      results.innerHTML = "";
      premiumCompromiseSection.hidden = true;
      premiumCompromiseResults.innerHTML = "";
      aboveBudgetSection.hidden = true;
      aboveBudgetResults.innerHTML = "";
      fallbackSection.hidden = true;
      fallbackResults.innerHTML = "";
      lastRankContext = null;
      lastReportContext = null;
      lastBuiltReport = null;
      lastRenderedData = null;
      lastFindCandidateUrls = [];
      lastFindPremiumCandidateUrls = [];
      budgetRealityScenarioReady = false;
      agentPlanOpened = false;
      clientReportOpened = false;
      clearSessionReports();
      setAiScenarioAvailability("auto");
      setActiveScenario("");
      setWorkflowStep(0);
    }

    function applyDemoPrompt() {
      const demo = demoPromptSelect?.selectedOptions?.[0];
      if (!demo || !demo.dataset.prompt) return;

      promptBox.value = demo.dataset.prompt || "";
      intent.value = demo.dataset.intent || "auto";
      purpose.value = demo.dataset.purpose || "auto";

      if (purpose.value === "sale" || purpose.value === "rent") {
        quickPurpose.value = purpose.value;
      }

      resetWorkflowOutput();
      updateGuidedDemo();
      promptBox.focus();
      promptBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Sync quick-filter purpose with main purpose
    if (purpose.value === "sale" || purpose.value === "rent") quickPurpose.value = purpose.value;
    purpose.addEventListener("change", () => {
      if (purpose.value === "sale" || purpose.value === "rent") quickPurpose.value = purpose.value;
    });

    // Quick filter toggle
    headerMenuToggle?.addEventListener("click", (event) => {
      event.stopPropagation();
      headerMenuPanel.hidden = !headerMenuPanel.hidden;
      headerMenuToggle.classList.toggle("on", !headerMenuPanel.hidden);
      headerMenuToggle.setAttribute("aria-expanded", String(!headerMenuPanel.hidden));
    });
    headerMenuPanel?.addEventListener("click", (event) => {
      if (event.target?.tagName === "BUTTON") {
        headerMenuPanel.hidden = true;
        headerMenuToggle.classList.remove("on");
        headerMenuToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("click", (event) => {
      if (!headerMenuPanel || headerMenuPanel.hidden) return;
      if (headerMenuPanel.contains(event.target) || event.target === headerMenuToggle) return;
      headerMenuPanel.hidden = true;
      headerMenuToggle.classList.remove("on");
      headerMenuToggle.setAttribute("aria-expanded", "false");
    });

    quickToggle.addEventListener("click", () => {
      quickBar.hidden = !quickBar.hidden;
      quickToggle.classList.toggle("on", !quickBar.hidden);
      quickToggle.textContent = quickBar.hidden ? "Quick filter ▾" : "Quick filter ▴";
    });

    // AI key toggle
    aiKeyToggle?.addEventListener("click", () => {
      keyBar.hidden = !keyBar.hidden;
      aiKeyToggle.classList.toggle("on", !keyBar.hidden);
      if (!keyBar.hidden) tokenBox.focus();
    });

    function ensureApiKeyVisible() {
      if (appConfig.serverManagedAi) return;
      if (!activeApiKey) {
        keyBar.hidden = false;
        aiKeyToggle.classList.add("on");
        tokenBox.focus();
      }
    }

    function currentApiToken() {
      return activeApiKey || tokenBox?.value.trim() || "";
    }

    // Communities popover
    commBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      commPanel.hidden = !commPanel.hidden;
      commBtn.classList.toggle("active", !commPanel.hidden);
    });
    document.addEventListener("click", (e) => {
      if (!commPanel.hidden && !commPanel.contains(e.target) && e.target !== commBtn) {
        commPanel.hidden = true;
        commBtn.classList.remove("active");
      }
    });

    // Owner drawer
    function openOwnerDrawer() {
      ownerDrawer.classList.add("open");
      drawerOverlay.hidden = false;
      ownerToggle.classList.add("on");
    }
    function closeDrawer() {
      ownerDrawer.classList.remove("open");
      drawerOverlay.hidden = true;
      ownerToggle.classList.remove("on");
    }
    ownerToggle.addEventListener("click", () => {
      ownerDrawer.classList.contains("open") ? closeDrawer() : openOwnerDrawer();
    });
    closeOwnerDrawer.addEventListener("click", closeDrawer);
    drawerOverlay.addEventListener("click", closeDrawer);

    // Auto-build toggle — grey out Build Report button while checked
    function syncAutoBuildState() {
      aiReportButton?.classList.toggle("build-auto", !!autoBuildReport?.checked);
    }
    autoBuildReport?.addEventListener("change", syncAutoBuildState);
    syncAutoBuildState();

    // Help panel
    specialToggle?.addEventListener("click", () => {
      toolsStrip.hidden = !toolsStrip.hidden;
      specialToggle.classList.toggle("on", !toolsStrip.hidden);
      if (!toolsStrip.hidden) toolsStrip.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    helpToggle.addEventListener("click", () => {
      helpPanel.hidden = !helpPanel.hidden;
      helpToggle.classList.toggle("on", !helpPanel.hidden);
    });

    function selectedListingCommunities() {
      return Array.from(document.querySelectorAll(".listing-community:checked")).map((i) => i.value);
    }
    function selectedMarketCommunities() {
      if (!advancedComps?.checked) return selectedListingCommunities();
      return Array.from(document.querySelectorAll(".market-community:checked")).map((i) => i.value);
    }
    function currentMarketScope() {
      return advancedComps?.checked ? marketScope.value : listingScope.value;
    }
    function currentMarketCommunities() {
      return selectedMarketCommunities();
    }

    function activateCommunityScope(scopeEl, customEl) {
      if (scopeEl.value !== "custom") { scopeEl.value = "custom"; customEl.hidden = false; }
    }
    function mirrorCommunitySelection(sourceClass, targetClass, community, checked) {
      if (!dualCommunities.checked) return;
      const target = Array.from(document.querySelectorAll(`.${targetClass}`)).find((i) => i.value === community);
      if (target) target.checked = checked;
    }
    function handleCommunitySelection(event) {
      const checkbox = event.target.closest(".listing-community, .market-community");
      if (!checkbox) return;
      if (checkbox.classList.contains("listing-community")) {
        activateCommunityScope(listingScope, listingCustom);
        mirrorCommunitySelection("listing-community", "market-community", checkbox.value, checkbox.checked);
        if (dualCommunities.checked) activateCommunityScope(marketScope, marketCustom);
      } else {
        activateCommunityScope(marketScope, marketCustom);
        mirrorCommunitySelection("market-community", "listing-community", checkbox.value, checkbox.checked);
        if (dualCommunities.checked) activateCommunityScope(listingScope, listingCustom);
      }
    }
    function syncAdvancedCompsPanel() {
      advancedCompsPanel.hidden = !advancedComps?.checked;
      listingCustom.hidden = listingScope.value !== "custom";
      marketCustom.hidden  = !advancedComps?.checked || marketScope.value !== "custom";
    }
    syncAdvancedCompsPanel();
    listingScope.addEventListener("change", syncAdvancedCompsPanel);
    marketScope.addEventListener("change", syncAdvancedCompsPanel);
    advancedComps?.addEventListener("change", syncAdvancedCompsPanel);
    listingCustom.addEventListener("change", handleCommunitySelection);
    marketCustom.addEventListener("change",  handleCommunitySelection);

    function money(value, purposeValue) {
      if (value === null || value === undefined || value === "") return "Unknown";
      const n = Number(value);
      if (!Number.isFinite(n)) return "Unknown";
      return n.toLocaleString() + (purposeValue === "rent" ? " AED/yr" : " AED");
    }
    function metric(label, value) {
      return `<div class="metric"><span>${label}</span><strong>${value || "—"}</strong></div>`;
    }
    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }
    function scoreBadgeClass(score) {
      const n = Number(score);
      if (n >= 70) return "high";
      if (n >= 40) return "mid";
      return "low";
    }

    function renderListings(items, purposeValue) {
      return items.map((item) => `
        <article class="listing">
          <div>
            <h2>${item.title || "Untitled listing"}</h2>
            <div class="facts">
              <span class="pill price">${money(item.price, purposeValue)}</span>
              <span class="pill">${item.bedrooms || "?"} bed</span>
              <span class="pill">${item.bathrooms || "?"} bath</span>
              <span class="pill">${item.predicted_community || "Unknown"}</span>
              <span class="pill">${item.predicted_type || "Type unknown"}</span>
              <span class="pill">${item.property_size_sqft || "?"} sqft</span>
            </div>
            ${item.ai_fit_summary ? `<div class="reasons"><strong>Summary:</strong> ${item.ai_fit_summary}</div>` : ""}
            ${item.ai_opportunity_angle ? `<div class="reasons"><strong>Opportunity:</strong> ${item.ai_opportunity_angle}</div>` : ""}
            ${item.ai_strengths ? `<div class="reasons"><strong>Strengths:</strong> ${item.ai_strengths}</div>` : ""}
            ${item.ai_concerns ? `<div class="reasons"><strong>Concerns:</strong> ${item.ai_concerns}</div>` : ""}
            ${item.ai_verify ? `<div class="reasons"><strong>Verify:</strong> ${item.ai_verify}</div>` : ""}
            ${item.match_reasons ? `<div class="reasons">${item.match_reasons}</div>` : ""}
            ${item.outdoor_matches ? `<div class="reasons"><strong>Clues:</strong> ${item.outdoor_matches}</div>` : ""}
            ${item.has_exclusive_warning ? `<div class="exclusive-box"><strong>Exclusive listing:</strong> likely strong agent-owner relationship. Avoid owner call unless you have another clear lead.</div>` : ""}
            ${item.similar_count > 1 ? `
              <div class="similar-box">
                <strong>Similar listing warning:</strong> ${item.similar_count} listings share close price/details. Check photos before treating as the same property.
                ${(item.similar_urls || []).map((url) => `
                  <div class="card-actions">
                    <a href="${url}" target="_blank" rel="noreferrer">${url}</a>
                    <button class="mini copy-link-button" type="button" data-copy="${escapeHtml(url)}">Copy</button>
                    <button class="mini owner-inline-lookup" type="button" data-url="${escapeHtml(url)}">Owner</button>
                  </div>`).join("")}
              </div>` : ""}
            <div class="card-actions">
              <a href="${item.url}" target="_blank" rel="noreferrer">Open listing</a>
              <button class="mini copy-link-button" type="button" data-copy="${escapeHtml(item.url || "")}">Copy link</button>
              <button class="mini owner-inline-lookup" type="button" data-url="${escapeHtml(item.url || "")}">Owner lookup</button>
            </div>
          </div>
          <div class="score"><span class="score-badge ${scoreBadgeClass(item.match_score)}">${item.match_score}</span></div>
        </article>`).join("");
    }

    function renderBasicSnapshot(items, purposeValue) {
      return (items || []).slice(0, 3).map((item, index) => `
        <article class="listing snapshot-listing">
          <div>
            <h2>${index + 1}. ${item.title || "Untitled listing"}</h2>
            <div class="facts">
              <span class="pill price">${money(item.price, purposeValue)}</span>
              <span class="pill">${item.bedrooms || "?"} bed</span>
              <span class="pill">${item.predicted_community || "Unknown"}</span>
              <span class="pill">${item.predicted_type || "Type unknown"}</span>
              <span class="pill">${item.property_size_sqft || "?"} sqft</span>
            </div>
            <div class="card-actions">
              <a href="${item.url}" target="_blank" rel="noreferrer">Open listing</a>
              <button class="mini copy-link-button" type="button" data-copy="${escapeHtml(item.url || "")}">Copy link</button>
            </div>
          </div>
          <div class="score"><span class="score-badge ${scoreBadgeClass(item.match_score)}">${item.match_score}</span></div>
        </article>`).join("");
    }

    async function copyText(value, btn) {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        if (btn) { const t = btn.textContent; btn.textContent = "Copied"; setTimeout(() => { btn.textContent = t; }, 1200); }
      } catch { error.hidden = false; error.textContent = "Could not copy. Select the URL and copy manually."; }
    }

    function handleListingActionClick(event) {
      const copyBtn = event.target.closest(".copy-link-button");
      if (copyBtn) { copyText(copyBtn.dataset.copy || "", copyBtn); return; }
      const ownerBtn = event.target.closest(".owner-inline-lookup");
      if (!ownerBtn) return;
      ownerUrlBox.value = ownerBtn.dataset.url || "";
      openOwnerDrawer();
      lookupOwner();
    }

    function snapshotBuiltReport(data) {
      const context = data.report_context || {};
      return {
        prompt: promptBox.value.trim(),
        purpose: data.enquiry?.purpose || purpose.value,
        scenario: context.scenario || activeScenario || intent.value,
        ranked_urls: Array.isArray(context.ranked_urls) ? context.ranked_urls.slice() : (data.matches || []).map((item) => item.url).filter(Boolean),
        matches: Array.isArray(data.matches) ? data.matches.slice() : [],
        report_title: data.report_title || "",
        client_response: data.client_response || "",
        ai: data.ai || {},
        enquiry: data.enquiry || {},
        listing_scope: listingScope.value,
        listing_communities: selectedListingCommunities(),
        market_scope: currentMarketScope(),
        market_communities: currentMarketCommunities(),
      };
    }

    function render(data) {
      lastRenderedData = data;
      error.hidden = true;
      spinner.style.display = "none";
      const hasAiScenarioResult = Boolean(data.rank_context || data.report_context);
      response.hidden = hasAiScenarioResult;
      reportToolbar.hidden = hasAiScenarioResult;
      bestShortlistTitle.hidden = false;
      bestShortlistTitle.textContent = data.report_title || "Best Shortlist";
      status.textContent = `${data.rows_searched} rows searched`;
      summary.innerHTML = [
        metric("Purpose", data.enquiry.purpose),
        metric("Budget", money(data.enquiry.budget, data.enquiry.purpose)),
        metric("Ceiling", money(data.enquiry.stretch_budget, data.enquiry.purpose)),
        metric("Beds", data.enquiry.bedrooms_label),
        metric("Community", data.enquiry.community || "Any"),
      ].join("");
      aiScenarioNote.hidden = hasAiScenarioResult;
      response.querySelector("div").textContent = [
        "click on ai scenario for a comprehensive result",
        data.client_response || "",
      ].filter(Boolean).join("\n\n");
      results.innerHTML = hasAiScenarioResult
        ? renderListings(data.matches || [], data.enquiry.purpose)
        : renderBasicSnapshot(data.matches || [], data.enquiry.purpose);
      const premiumCompromises = data.premium_compromise_matches || [];
      premiumCompromiseSection.hidden = !hasAiScenarioResult || premiumCompromises.length === 0;
      premiumCompromiseResults.innerHTML = renderListings(premiumCompromises, data.enquiry.purpose);
      const watchlist = data.over_budget_matches || [];
      aboveBudgetSection.hidden = !hasAiScenarioResult || watchlist.length === 0;
      aboveBudgetResults.innerHTML = renderListings(watchlist, data.enquiry.purpose);
      const fallback = data.fallback_matches || [];
      fallbackSection.hidden = !hasAiScenarioResult || fallback.length === 0;
      fallbackResults.innerHTML = renderListings(fallback, data.enquiry.purpose);
      if (data.rank_context) lastRankContext = data.rank_context;
      if (data.rank_context?.scenario) setActiveScenario(data.rank_context.scenario);
      if (data.report_context) {
        lastReportContext = data.report_context;
        lastBuiltReport = snapshotBuiltReport(data);
        agentPlanOpened = false;
        clientReportOpened = false;
        clearSessionReports();
      } else {
        lastBuiltReport = null;
      }
      if (Object.prototype.hasOwnProperty.call(data, "find_intent")) {
        setAiScenarioAvailability(data.find_intent || "auto");
      }
      if (data.report_context?.scenario) setActiveScenario(data.report_context.scenario);
      // Advance the workflow indicator based on how far we've got
      if (data.report_context) {
        setWorkflowStep(3);   // steps ①②③ done, outputs next
        aiReportButton.classList.add("build-done");
        aiReportButton.classList.remove("build-failed");
      } else if (data.rank_context) setWorkflowStep(2); // ①② done, build report next
      else setWorkflowStep(1);                           // ① done, scenario next
    }

    function clearPage() {
      promptBox.value = "";
      ownerUrlBox.value = "";
      summary.innerHTML = "";
      aiScenarioNote.hidden = true;
      response.hidden = true;
      response.querySelector("div").textContent = "";
      reportToolbar.hidden = true;
      bestShortlistTitle.hidden = true;
      bestShortlistTitle.textContent = "Best Shortlist";
      aiPanel.hidden = true;
      aiPanel.innerHTML = "";
      estimatePanel.hidden = true;
      estimatePanel.innerHTML = "";
      opportunityPanel.hidden = true;
      opportunityPanel.innerHTML = "";
      ownerPanel.innerHTML = "";
      error.hidden = true;
      error.textContent = "";
      results.innerHTML = "";
      premiumCompromiseSection.hidden = true;
      premiumCompromiseResults.innerHTML = "";
      aboveBudgetSection.hidden = true;
      aboveBudgetResults.innerHTML = "";
      fallbackSection.hidden = true;
      fallbackResults.innerHTML = "";
      spinner.style.display = "none";
      status.textContent = activeApiKey ? "API active" : "Local data only";
      lastRankContext = null;
      lastReportContext = null;
      lastBuiltReport = null;
      lastRenderedData = null;
      lastFindCandidateUrls = [];
      lastFindPremiumCandidateUrls = [];
      budgetRealityScenarioReady = false;
      agentPlanOpened = false;
      clientReportOpened = false;
      clearSessionReports();
      setAiScenarioAvailability("auto");
      setActiveScenario("");
      setWorkflowStep(0);
      promptBox.focus();
    }

    async function runSearch() {
      const text = promptBox.value.trim();
      if (!text) { promptBox.focus(); return; }
      const findIntent = intent.value || "auto";
      button.disabled = true;
      button.textContent = "Finding…";
      response.hidden = true;
      reportToolbar.hidden = true;
      bestShortlistTitle.hidden = true;
      error.hidden = true;
      results.innerHTML = "";
      premiumCompromiseSection.hidden = true;
      premiumCompromiseResults.innerHTML = "";
      aboveBudgetSection.hidden = true;
      aboveBudgetResults.innerHTML = "";
      fallbackSection.hidden = true;
      fallbackResults.innerHTML = "";
      spinner.style.display = "block";
      lastFindCandidateUrls = [];
      lastFindPremiumCandidateUrls = [];
      budgetRealityScenarioReady = false;
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            purpose: purpose.value,
            intent: findIntent,
            listing_scope: listingScope.value,
            listing_communities: selectedListingCommunities(),
            market_scope: currentMarketScope(),
            market_communities: currentMarketCommunities(),
            limit: 20
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        data.find_intent = findIntent;
        lastFindCandidateUrls = [
          ...(data.matches || []),
          ...(data.premium_compromise_matches || []),
          ...(data.over_budget_matches || []),
          ...(data.fallback_matches || []),
        ].map((item) => item.url).filter((url, index, urls) => url && urls.indexOf(url) === index);
        lastFindPremiumCandidateUrls = (data.premium_compromise_matches || [])
          .map((item) => item.url)
          .filter((url, index, urls) => url && urls.indexOf(url) === index);
        render(data);
      } catch (err) {
        error.hidden = false;
        error.textContent = err.message;
      } finally {
        spinner.style.display = "none";
        button.disabled = false;
        button.textContent = "Find";
      }
    }

    async function runQuickQuery() {
      quickButton.disabled = true;
      quickButton.textContent = "Filtering…";
      error.hidden = true;
      aiPanel.hidden = true;
      premiumCompromiseSection.hidden = true;
      aboveBudgetSection.hidden = true;
      fallbackSection.hidden = true;
      premiumCompromiseResults.innerHTML = "";
      aboveBudgetResults.innerHTML = "";
      fallbackResults.innerHTML = "";
      spinner.style.display = "block";
      try {
        const res = await fetch("/api/quick-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: quickPurpose.value,
            min_beds: quickBedMin.value,
            max_beds: quickBedMax.value,
            min_price: quickPriceMin.value,
            max_price: quickPriceMax.value,
            community: quickCommunity.value,
            category: quickCategory.value
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Quick query failed");
        render(data);
      } catch (err) {
        error.hidden = false;
        error.textContent = err.message;
      } finally {
        spinner.style.display = "none";
        quickButton.disabled = false;
        quickButton.textContent = "Filter";
      }
    }

    async function checkOpenAiKey() {
      if (!tokenBox || !checkButton) return;
      const token = tokenBox.value.trim();
      if (!token) { error.hidden = false; error.textContent = "Add an OpenAI API key first."; tokenBox.focus(); return; }
      checkButton.disabled = true;
      checkButton.textContent = "Checking…";
      error.hidden = true;
      aiPanel.hidden = false;
      aiPanel.textContent = "Checking OpenAI connection...";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch("/api/check-openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: token }),
          signal: controller.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "OpenAI check failed");
        activeApiKey = token;
        tokenBox.hidden = true;
        tokenBox.value = "";
        checkButton.classList.add("on");
        checkButton.textContent = "Key active";
        keyBar.classList.add("ready");
        aiKeyToggle.classList.add("on");
        aiKeyToggle.textContent = "AI key ✓";
        aiPanel.textContent = data.message || "OpenAI connection is ready.";
        // Auto-collapse the key bar — the header "AI key ✓" carries the status
        setTimeout(() => {
          keyBar.hidden = true;
          aiKeyToggle.classList.remove("on");
        }, 1500);
      } catch (err) {
        activeApiKey = "";
        keyBar.classList.remove("ready");
        error.hidden = false;
        error.textContent = err.name === "AbortError" ? "OpenAI check timed out after 30 seconds." : err.message;
        aiPanel.hidden = true;
      } finally {
        clearTimeout(timeoutId);
        checkButton.disabled = false;
        if (!activeApiKey) checkButton.textContent = "Check key";
      }
    }

    function renderOwnerLookup(data) {
      if (!data.found) {
        ownerPanel.innerHTML = `<div style="color:var(--muted);font-size:13px">${data.message || "No matching owner lead found for this URL."}</div>`;
        return;
      }
      const lead = data.lead || {};
      const urls = (data.propertyfinder_urls || []).map((url) => `
        <div class="card-actions" style="margin-top:6px">
          <a href="${url}" target="_blank" rel="noreferrer" style="font-size:12px;overflow-wrap:anywhere">${url}</a>
          <button class="mini copy-link-button" type="button" data-copy="${escapeHtml(url)}">Copy</button>
        </div>`).join("");
      ownerPanel.innerHTML = `
        <div class="owner-result">
          <div><strong>Owners:</strong> ${lead.owners || "Unknown"}</div>
          <div><strong>Numbers:</strong> ${lead.numbers || "Unknown"}</div>
          <div><strong>Villa No:</strong> ${lead.villa_number || "Unknown"} &nbsp; <strong>Street:</strong> ${lead.street || "Unknown"}</div>
          <div><strong>Community:</strong> ${lead.community || "Unknown"} &nbsp; <strong>Area:</strong> ${lead.area || "Unknown"}</div>
          <div><strong>Property:</strong> ${lead.property || "Unknown"}</div>
          <div><strong>Beds:</strong> ${lead.beds || "?"} &nbsp; <strong>Type:</strong> ${lead.type || "?"}</div>
          <div><strong>Floors:</strong> ${lead.floors || "?"} &nbsp; <strong>Parking:</strong> ${lead.parking || "?"}</div>
          <div><strong>GFA:</strong> ${lead.gfa || "?"} &nbsp; <strong>BUA:</strong> ${lead.bua || "?"}</div>
          <div><strong>Asking:</strong> ${lead.asking || "?"} &nbsp; <strong>Rental:</strong> ${lead.rental || "?"}</div>
          ${lead.land_number ? `<div><strong>Land number:</strong> ${lead.land_number}</div>` : ""}
          ${(lead.latitude || lead.longitude) ? `<div><strong>Coordinates:</strong> ${lead.latitude || "?"}, ${lead.longitude || "?"}</div>` : ""}
          ${lead.status ? `<div><strong>Status:</strong> ${lead.status}</div>` : ""}
          ${lead.notes ? `<div><strong>Notes:</strong> ${lead.notes}</div>` : ""}
          <div style="margin-top:4px;font-size:11px;color:var(--muted)">Matched by: ${data.match_type || "URL"}</div>
          ${urls}
        </div>`;
    }
    ownerPanel.addEventListener("click", (event) => {
      const copyBtn = event.target.closest(".copy-link-button");
      if (copyBtn) copyText(copyBtn.dataset.copy || "", copyBtn);
    });

    async function lookupOwner() {
      const url = ownerUrlBox.value.trim();
      if (!url) { ownerUrlBox.focus(); return; }
      ownerButton.disabled = true;
      ownerButton.textContent = "Looking up…";
      ownerPanel.innerHTML = "";
      try {
        const res = await fetch("/api/owner-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Owner lookup failed");
        renderOwnerLookup(data);
      } catch (err) {
        ownerPanel.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
      } finally {
        ownerButton.disabled = false;
        ownerButton.textContent = "Lookup owner";
      }
    }

    async function runAiFeedback() {
      return runAiReport({ buttonElement: aiButton, buttonText: "General", endpoint: "/api/ai-feedback", progressStart: "Shortlisting your database..." });
    }
    async function runScenario(scenario, buttonElement) {
      if (!lastFindCandidateUrls.length) {
        error.hidden = false;
        error.textContent = "Run Find first so the scenario can rank that shortlist.";
        return null;
      }
      const labels = { best_value: "Best value", budget_reality: "Budget reality", fallback: "Fallback", negotiation: "Negotiation", listing_opportunity: "Listing opp.", upgrade_potential: "Upgrade", move_in_ready: "Move-in ready" };
      const starts = { best_value: "Building value shortlist...", budget_reality: "Building budget reality case...", fallback: "Building premium fallback shortlist...", negotiation: "Building negotiation case...", listing_opportunity: "Finding listing opportunities...", upgrade_potential: "Finding upgrade potential...", move_in_ready: "Finding move-in ready options..." };
      const buttonText = labels[scenario] || "Scenario";
      const rankedData = await runAiReport({ buttonElement, buttonText, endpoint: "/api/ai-scenario-rank", progressStart: starts[scenario] || "Building scenario report...", scenario, candidateUrls: lastFindCandidateUrls, premiumCandidateUrls: lastFindPremiumCandidateUrls });

      if (rankedData && scenario === "budget_reality") {
        budgetRealityScenarioReady = true;
        setAiScenarioAvailability(activeFindIntent);
      }

      if (rankedData && autoBuildReport?.checked && lastRankContext?.ranked_urls?.length) {
        return runBuildReport(buttonElement, buttonText);
      }

      return rankedData;
    }
    async function runBuildReport(buttonElement = aiReportButton, buttonText = "Build report") {
      if (!lastRankContext) { error.hidden = false; error.textContent = "Rank a scenario first, then build the report."; return; }
      const result = await runAiReport({ buttonElement, buttonText, endpoint: "/api/ai-scenario-report", progressStart: "Building report from ranked shortlist...", scenario: lastRankContext.scenario, rankedUrls: lastRankContext.ranked_urls });
      if (!result) {
        // Build Report failed — make retry obvious
        aiReportButton.classList.add("build-failed");
        aiReportButton.classList.remove("build-done");
      }
      return result;
    }

    function approxMoney(value, purposeValue) {
      const n = Number(value);
      if (!Number.isFinite(n)) return "Price to verify";
      if (purposeValue === "rent") {
        const rounded = Math.round(n / 5000) * 5000;
        return `around AED ${Math.round(rounded / 1000)}k/year`;
      }
      if (n >= 1_000_000) {
        const rounded = Math.round(n / 100000) * 100000;
        return `around AED ${(rounded / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
      }
      return `around AED ${Math.round(n / 1000)}k`;
    }

    function approxSize(value) {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return "size to verify";
      const mid = Math.round(n / 100) * 100;
      const low = Math.max(0, mid - 100);
      const high = mid + 100;
      return `approx. ${low.toLocaleString()}-${high.toLocaleString()} sqft`;
    }

    function clientCategory(item) {
      const text = `${item.title || ""} ${item.url || ""}`.toLowerCase();
      if (text.includes("townhouse") || text.includes("townhouse-for-")) return "townhouse";
      if (text.includes("villa") || text.includes("villa-for-")) return "villa";
      return "home";
    }

    function clientAvailability(item) {
      const text = [
        item.title,
        item.ai_fit_summary,
        item.ai_strengths,
        item.match_reasons,
      ].join(" ").toLowerCase();
      if (text.includes("vacant on transfer") || /\bvot\b/.test(text)) return "vacant on transfer / timing to verify";
      if (text.includes("ready to move") || text.includes("available now") || text.includes("vacant now") || text.includes("keys")) return "vacant / near-immediate availability";
      if (text.includes("vacant") || text.includes("available")) return "availability indicated, to verify";
      if (text.includes("notice served") || text.includes("rented")) return "timing depends on current occupancy";
      return "availability to verify";
    }

    function sanitizeClientText(value) {
      let text = String(value || "");
      text = text.replace(/https?:\/\/\S+/gi, "");
      text = text.replace(/\bProperty Finder\b/gi, "");
      text = text.replace(/\bowner[- ]?lead\b/gi, "follow-up");
      text = text.replace(/\bpoach(?:ing)?\b/gi, "follow-up");
      text = text.replace(/\bagent\b/gi, "representative");
      text = text.replace(/\bexclusive\b/gi, "represented");
      text = text.replace(/\bpermit\b[^.,;]*/gi, "");
      text = text.replace(/\b(listing|advert|description)\b/gi, "option");
      text = text.replace(/\s+/g, " ").trim();
      return text;
    }

    function splitClientPoints(value, maxPoints = 3) {
      const text = sanitizeClientText(value);
      if (!text) return [];
      return text
        .split(/;|\.|\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => part.length > 8)
        .slice(0, maxPoints);
    }

    function clientSellingPoints(item) {
      const points = [
        ...splitClientPoints(item.ai_strengths, 3),
        ...splitClientPoints(item.ai_fit_summary, 2),
      ];
      if (item.outdoor_matches) {
        const outdoor = String(item.outdoor_matches)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
        if (outdoor) points.push(`Outdoor/lifestyle clues: ${outdoor}`);
      }
      return [...new Set(points)].slice(0, 4);
    }

    function clientRecommendation(item, index) {
      const text = sanitizeClientText(item.ai_fit_summary || item.ai_opportunity_angle || item.match_reasons || "");
      if (text) return text;
      if (index === 0) return "Strongest overall match from the current shortlist, subject to availability and condition checks.";
      return "Worth keeping as a comparison option, subject to availability and viewing feedback.";
    }

    function clientScore(item) {
      const score = Number(item.ai_score || item.match_score || 0);
      if (!Number.isFinite(score) || score <= 0) return "To assess";
      return `${Math.min(95, Math.max(55, Math.round(score)))}/100`;
    }

    function renderClientOption(item, index, purposeValue) {
      const community = escapeHtml(item.predicted_community || "Area to verify");
      const type = escapeHtml(`${item.predicted_type && item.predicted_type !== "Unknown" ? item.predicted_type + " " : ""}${clientCategory(item)}`);
      const beds = item.bedrooms ? `${escapeHtml(item.bedrooms)} bed${Number(item.bedrooms) === 1 ? "" : "s"}` : "bedrooms to verify";
      const points = clientSellingPoints(item);
      const pointHtml = points.length
        ? `<ul>${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>`
        : `<ul><li>Potentially suitable option based on price, area and property profile.</li></ul>`;
      return `
        <article class="client-option">
          <h2>Option ${index + 1} — ${community}</h2>
          <div class="client-facts">
            <span>${escapeHtml(type)}</span>
            <span>${beds}</span>
            <span>${escapeHtml(approxMoney(item.price, purposeValue))}</span>
            <span>${escapeHtml(approxSize(item.property_size_sqft))}</span>
          </div>
          <p><strong>Availability:</strong> ${escapeHtml(clientAvailability(item))}</p>
          <p><strong>Suitability score:</strong> ${escapeHtml(clientScore(item))}</p>
          <div><strong>Key selling points:</strong>${pointHtml}</div>
          <p><strong>Recommendation:</strong> ${escapeHtml(clientRecommendation(item, index))}</p>
          <p class="next-step">Next step: I will verify current availability, condition and viewing access before sharing any appointment options.</p>
        </article>`;
    }

    function openClientReport() {
      if (!lastRenderedData || !Array.isArray(lastRenderedData.matches) || !lastRenderedData.matches.length) {
        error.hidden = false;
        error.textContent = "Run Find or an AI scenario first, then create a client report.";
        return;
      }
      const data = lastRenderedData;
      const purposeValue = data.enquiry?.purpose || purpose.value || "sale";
      const options = data.matches.slice(0, 5);
      const generatedAt = new Date().toLocaleString();
      const budget = data.enquiry?.budget ? approxMoney(data.enquiry.budget, purposeValue) : "budget to verify";
      const community = data.enquiry?.community || "selected area";
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Client Property Shortlist</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17211c; margin: 0; background: #f5f6f3; }
    main { width: min(860px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 48px; }
    header { border-bottom: 2px solid #0b6b57; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    .meta { color: #66736b; font-size: 13px; line-height: 1.5; }
    .intro { background: #fff; border: 1px solid #d7ded8; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; line-height: 1.5; }
    .client-option { background: #fff; border: 1px solid #d7ded8; border-radius: 8px; padding: 16px; margin-bottom: 12px; break-inside: avoid; }
    .client-option h2 { font-size: 18px; margin: 0 0 10px; color: #0b6b57; }
    .client-facts { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px; }
    .client-facts span { border: 1px solid #d7ded8; border-radius: 999px; padding: 5px 9px; font-size: 12px; color: #33423a; background: #fbfcfa; }
    p { font-size: 14px; line-height: 1.5; margin: 8px 0; }
    ul { margin: 6px 0 8px 18px; padding: 0; }
    li { margin: 4px 0; line-height: 1.4; }
    .next-step { color: #0b6b57; font-weight: 600; }
    .fine-print { margin-top: 18px; color: #66736b; font-size: 12px; line-height: 1.5; }
    .actions { margin: 0 0 14px; }
    button { min-height: 34px; padding: 0 14px; border: 0; border-radius: 6px; background: #0b6b57; color: #fff; font-weight: 700; cursor: pointer; }
    @media print { body { background: #fff; } main { width: 100%; padding: 0; } .actions { display: none; } .client-option, .intro { border-color: #ccc; } }
  </style>
</head>
<body>
  <main>
    <div class="actions"><button onclick="window.print()">Save as PDF</button></div>
    <header>
      <h1>Property Shortlist</h1>
      <div class="meta">${escapeHtml(community)} · ${escapeHtml(budget)} · prepared ${escapeHtml(generatedAt)}</div>
    </header>
    <section class="intro">
      <p>This shortlist summarises the strongest available options based on the current brief. Prices, sizes and availability are shown as approximate and will be verified before viewings are arranged.</p>
    </section>
    ${options.map((item, index) => renderClientOption(item, index, purposeValue)).join("")}
    <p class="fine-print">Note: details are indicative only and subject to availability, final viewing confirmation, owner approval and contract terms.</p>
  </main>
</body>
</html>`;
      writeReportWindow(reportWindow, html);
    }

    function openReportWindow(title, message) {
      const reportWindow = window.open("", "_blank");
      if (!reportWindow) return null;
      reportWindow.document.open();
      reportWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17211c; margin: 0; background: #eef0ed; }
    main { max-width: 720px; margin: 0 auto; padding: 48px 20px; }
    .box { background: #fff; border: 1px solid #d7ded8; border-radius: 8px; padding: 22px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0; color: #66736b; line-height: 1.5; }
  </style>
</head>
<body><main><section class="box"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></section></main></body>
</html>`);
      reportWindow.document.close();
      return reportWindow;
    }

    function writeReportWindow(reportWindow, html) {
      if (!reportWindow) return false;
      reportWindow.document.open();
      reportWindow.document.write(html);
      reportWindow.document.close();
      return true;
    }

    function saveSessionReport(kind, html) {
      try {
        sessionStorage.setItem(reportStorageKeys[kind], html);
      } catch (err) {
        console.warn("Could not store report in session storage", err);
      }
    }

    function getSessionReport(kind) {
      try {
        return sessionStorage.getItem(reportStorageKeys[kind]) || "";
      } catch (err) {
        return "";
      }
    }

    function clearSessionReports() {
      try {
        sessionStorage.removeItem(reportStorageKeys.agent);
        sessionStorage.removeItem(reportStorageKeys.client);
      } catch (err) {
        console.warn("Could not clear report session storage", err);
      }
    }

    function reopenSessionReport(kind, title) {
      const html = getSessionReport(kind);
      if (!html) return false;
      const reportWindow = openReportWindow(title, "Opening stored report...");
      if (!reportWindow) {
        error.hidden = false;
        error.textContent = `Popup blocked. Allow popups for this page to reopen the ${title.toLowerCase()}.`;
        return true;
      }
      writeReportWindow(reportWindow, html);
      error.hidden = true;
      return true;
    }

    function writeReportError(reportWindow, title, message) {
      if (!reportWindow || reportWindow.closed) return;
      reportWindow.document.open();
      reportWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17211c; margin: 0; background: #fff4f0; }
    main { max-width: 720px; margin: 0 auto; padding: 48px 20px; }
    .box { background: #fff; border: 1px solid #e3aa95; border-radius: 8px; padding: 22px; }
    h1 { margin: 0 0 8px; font-size: 22px; color: #9b2d20; }
    p { margin: 0; color: #66736b; line-height: 1.5; }
  </style>
</head>
<body><main><section class="box"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></section></main></body>
</html>`);
      reportWindow.document.close();
    }

    function renderAgentPlan(plan, reportWindow) {
      const actions = Array.isArray(plan.priority_actions) ? plan.priority_actions : [];
      const checklist = Array.isArray(plan.scenario_checklist) ? plan.scenario_checklist : [];
      const logic = Array.isArray(plan.decision_logic) ? plan.decision_logic : [];
      const nextSteps = Array.isArray(plan.immediate_next_steps) ? plan.immediate_next_steps : [];
      const warnings = Array.isArray(plan.warnings) ? plan.warnings : [];

      const actionCards = actions.map((item) => {
        const questions = Array.isArray(item.verification_questions) ? item.verification_questions : [];
        const listingUrl = item.listing_url || "";
        const listingActions = listingUrl ? `
                  <a class="agent-action-link" href="${escapeHtml(listingUrl)}" target="_blank" rel="noreferrer">Open</a>
                  <button class="agent-action-button" type="button" data-copy="${escapeHtml(listingUrl)}" onclick="navigator.clipboard.writeText(this.dataset.copy); this.textContent='Copied';">Copy</button>` : "";
        return `
          <article class="agent-action-card">
            <div class="agent-action-top">
              <span class="agent-priority">${escapeHtml(item.priority || "")}</span>
              <div>
                <h3>${escapeHtml(item.listing || "Listing to verify")}</h3>
                <div class="agent-decision-row">
                  <span class="agent-decision">${escapeHtml(item.decision || item.recommended_action || "Call to verify")}</span>
                  ${item.owner_lookup_recommended ? `<span class="agent-mini-pill">Owner lookup</span>` : ""}
                  ${item.risk_level ? `<span class="agent-mini-pill">${escapeHtml(item.risk_level)}</span>` : ""}
                  ${listingActions}
                </div>
              </div>
            </div>
            <p><strong>Why:</strong> ${escapeHtml(item.why || "")}</p>
            <p><strong>Action:</strong> ${escapeHtml(item.recommended_action || "")}</p>
            <div class="agent-call-box">
              <div class="agent-box-label">Conversation angle</div>
              <p>${escapeHtml(item.conversation_angle || "")}</p>
              <div class="agent-box-label">Call opener</div>
              <p>"${escapeHtml(item.call_opener || "")}"</p>
            </div>
            ${questions.length ? `<div class="agent-question-list"><strong>Questions:</strong><ul>${questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul></div>` : ""}
            ${item.buyer_message ? `<div class="agent-buyer-message"><strong>Buyer message:</strong><p>${escapeHtml(item.buyer_message)}</p></div>` : ""}
          </article>`;
      }).join("");

      const generatedAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(plan.title || "Agent Plan of Action")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #17211c; margin: 0; background: #eef0ed; }
    main { max-width: 980px; margin: 0 auto; padding: 32px 16px 56px; }
    .actions { position: sticky; top: 0; z-index: 2; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 0 14px; background: #eef0ed; }
    button { min-height: 34px; padding: 0 16px; border: 0; border-radius: 6px; background: #0b6b57; color: #fff; font-weight: 700; cursor: pointer; font-size: 14px; }
    .agent-plan { background: #fff; border: 1px solid #d7ded8; border-radius: 8px; padding: 22px; }
    .agent-plan-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; border-bottom: 1px solid #d7ded8; padding-bottom: 16px; margin-bottom: 16px; }
    .agent-plan-header h1 { margin: 0 0 6px; font-size: 26px; color: #11231c; }
    .agent-plan-header p { margin: 0; color: #66736b; line-height: 1.5; font-size: 14px; }
    .agent-meta { margin-top: 8px; color: #7a8a80; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
    .agent-scenario, .agent-mini-pill { display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid #dfc392; background: #fff8ec; color: #8b5a16; padding: 4px 8px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .agent-action-grid { display: grid; gap: 12px; margin-bottom: 16px; }
    .agent-action-card { border: 1px solid #d7ded8; border-radius: 8px; padding: 16px; background: #fffdfa; break-inside: avoid; }
    .agent-action-top { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
    .agent-priority { width: 32px; height: 32px; flex: 0 0 32px; border-radius: 50%; display: grid; place-items: center; background: #8b5a16; color: #fff; font-weight: 800; }
    .agent-action-card h3 { margin: 0 0 6px; font-size: 16px; color: #11231c; }
    .agent-decision-row { display: flex; flex-wrap: wrap; gap: 5px; }
    .agent-decision { border-radius: 999px; background: #0b6b57; color: #fff; padding: 4px 8px; font-size: 11px; font-weight: 700; }
    .agent-action-link, .agent-action-button { min-height: 24px; display: inline-flex; align-items: center; border: 1px solid #d7ded8; border-radius: 999px; background: #fff; color: #0b6b57; padding: 0 9px; font: inherit; font-size: 11px; font-weight: 700; text-decoration: none; cursor: pointer; }
    .agent-action-card p { margin: 7px 0; line-height: 1.5; font-size: 13px; color: #33423a; }
    .agent-call-box, .agent-buyer-message { border-left: 3px solid #8b5a16; background: #fff8ec; border-radius: 4px; padding: 10px 12px; margin-top: 9px; }
    .agent-box-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #8b5a16; margin-top: 4px; }
    .agent-question-list ul, .agent-support-box ul { margin: 6px 0 0 18px; padding: 0; font-size: 13px; line-height: 1.45; }
    .agent-support-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .agent-support-box { border: 1px solid #d7ded8; border-radius: 8px; padding: 12px; background: #fbfcfa; break-inside: avoid; }
    .agent-support-box.warning { background: #fff4f0; border-color: #e3aa95; }
    .agent-support-box h3 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #0b6b57; }
    @media print { body { background: #fff; } main { max-width: 100%; padding: 0; } .actions { display: none; } .agent-plan, .agent-action-card, .agent-support-box { box-shadow: none; border-color: #ccc; } }
  </style>
</head>
<body>
  <main>
    <div class="actions"><button onclick="window.print()">Save PDF</button></div>
        <section class="agent-plan">
          <div class="agent-plan-header">
            <div>
              <h1>${escapeHtml(plan.title || "Agent Plan of Action")}</h1>
              <p>${escapeHtml(plan.agent_summary || "")}</p>
              <div class="agent-meta">Prepared: ${escapeHtml(generatedAt)}</div>
            </div>
            <span class="agent-scenario">${escapeHtml(plan.scenario || "Scenario")}</span>
          </div>
          <div class="agent-action-grid">${actionCards || "<p>No agent actions returned.</p>"}</div>
          <div class="agent-support-grid">
            <div class="agent-support-box">
              <h3>Scenario checklist</h3>
              <ul>${checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="agent-support-box">
              <h3>Decision logic</h3>
              <ul>${logic.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="agent-support-box">
              <h3>Next steps</h3>
              <ul>${nextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            ${warnings.length ? `<div class="agent-support-box warning"><h3>Warnings</h3><ul>${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
          </div>
        </section>
  </main>
</body>
</html>`;
      saveSessionReport("agent", html);
      writeReportWindow(reportWindow, html);
      aiPanel.hidden = false;
      aiPanel.textContent = "Agent plan opened in a new tab.";
    }

    async function runAgentPlan() {
      if (agentPlanOpened) {
        if (!reopenSessionReport("agent", "Agent plan")) {
          error.hidden = false;
          error.textContent = "Agent plan was already opened, but this browser session no longer has the stored report. Run a new search or Build report again to create another.";
        }
        return;
      }
      const text = promptBox.value.trim();
      const token = currentApiToken();
      if (!text) { promptBox.focus(); return; }
      if (!token) { error.hidden = false; error.textContent = "Add and check an OpenAI API key first (AI key button above)."; return; }
      const built = lastBuiltReport;
      const builtMatches = Array.isArray(built?.matches) ? built.matches.slice(0, 8) : [];
      if ((!built || !built.ranked_urls?.length) && !builtMatches.length) {
        error.hidden = false;
        error.textContent = "Run Build Report first, then create the agent plan.";
        return;
      }
      const rankedUrls = built?.ranked_urls || builtMatches.map((item) => item.url).filter(Boolean);
      const scenario = built?.scenario || activeScenario || intent.value;
      const builtReport = {
        title: built?.report_title || "",
        summary: built?.client_response || "",
        market_read: built?.ai?.market_read || "",
        conclusion: built?.ai?.client_response || "",
      };
      const reportWindow = openReportWindow("Agent plan", "Generating the agent plan. This window will update automatically.");
      if (!reportWindow) {
        error.hidden = false;
        error.textContent = "Popup blocked. Allow popups for this page to open the agent plan.";
        return;
      }
      agentPlanButton.disabled = true;
      agentPlanButton.textContent = "Planning...";
      error.hidden = true;
      aiPanel.hidden = false;
      aiPanel.textContent = "Turning the built report into actions, call angles and verification logic...";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 240000);
      try {
        const res = await fetch("/api/agent-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: built?.prompt || text, purpose: built?.purpose || purpose.value, scenario, listing_scope: built?.listing_scope || listingScope.value, listing_communities: built?.listing_communities || selectedListingCommunities(), market_scope: built?.market_scope || currentMarketScope(), market_communities: built?.market_communities || currentMarketCommunities(), api_key: token, limit: 6, ranked_urls: rankedUrls, built_matches: builtMatches, built_report: builtReport }),
          signal: controller.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Agent plan failed");
        renderAgentPlan(data.agent_plan || {}, reportWindow);
        agentPlanOpened = true;
        agentPlanButton.disabled = false;
        agentPlanButton.textContent = "Reopen agent plan";
        agentPlanButton.classList.remove("step-ready");
        wf4a?.classList.remove("active");
        wf4a?.classList.add("done");
      } catch (err) {
        error.hidden = false;
        error.textContent = err.name === "AbortError" ? "Agent plan timed out. Try fewer ranked results." : err.message;
        writeReportError(reportWindow, "Agent plan failed", error.textContent);
        aiPanel.hidden = true;
      } finally {
        clearTimeout(timeoutId);
        if (!agentPlanOpened) {
          agentPlanButton.disabled = false;
          agentPlanButton.textContent = "Agent plan";
        }
      }
    }

    function renderAiClientReport(report, reportWindow) {
      const txn = report.transaction_section || {};
      const inv = report.inventory_section || {};
      const alt = report.alternative_section || {};
      const cmp = report.comparison_section || {};
      const strat = report.strategic_assessment || {};
      const generatedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

      function renderListingCard(listing) {
        return `
          <div class="listing-card">
            <div class="listing-label">${escapeHtml(listing.label || "")}</div>
            <div class="listing-price">${escapeHtml(listing.price || "")}</div>
            <div class="listing-tag">${escapeHtml(listing.description_tag || "")}</div>
            <div class="listing-stats">${escapeHtml(listing.stats_line || "")}</div>
            <p class="listing-narrative">${escapeHtml(listing.narrative || "")}</p>
          </div>`;
      }

      function renderSectionHeading(num, title) {
        return `<div class="section-heading"><span class="section-num">${escapeHtml(num)} —</span> <span class="section-title">${escapeHtml(title)}</span></div>`;
      }

      const transactions = Array.isArray(txn.transactions) ? txn.transactions : [];
      const txnTableRows = transactions.map((t) => `
        <tr>
          <td>${escapeHtml(t.date || "")}</td>
          <td>${escapeHtml(t.price || "")}</td>
          <td>${escapeHtml(t.size || "")}</td>
          <td>${escapeHtml(t.ppsf || "")}</td>
        </tr>`).join("");
      const txnHtml = `
        <section class="report-section">
          ${renderSectionHeading("01", txn.heading || "RECENT TRANSACTION DATA")}
          ${txn.community_scope ? `<div class="report-scope-tag">📍 ${escapeHtml(txn.community_scope)}</div>` : ""}
          <table class="data-table">
            <thead><tr><th>DATE</th><th>SOLD PRICE (AED)</th><th>SIZE (sqft)</th><th>AED/sqft</th></tr></thead>
            <tbody>${txnTableRows}</tbody>
          </table>
          <div class="stats-box">
            <div class="stat-cell"><div class="stat-label">Sales Range</div><div class="stat-value">${escapeHtml(txn.range || "")}</div></div>
            <div class="stat-cell"><div class="stat-label">Average Sold Price</div><div class="stat-value">${escapeHtml(txn.average_price || "")}</div></div>
            <div class="stat-cell"><div class="stat-label">Average AED/sqft</div><div class="stat-value">${escapeHtml(txn.average_ppsf || "")}</div></div>
            <div class="stat-cell"><div class="stat-label">Layout Note</div><div class="stat-value">${escapeHtml(txn.layout_note || "")}</div></div>
          </div>
          <p class="narrative">${escapeHtml(txn.narrative || "")}</p>
        </section>`;

      const invListings = Array.isArray(inv.listings) ? inv.listings : [];
      const invHtml = `
        <section class="report-section">
          ${renderSectionHeading("02", inv.heading || "CURRENT INVENTORY")}
          ${invListings.map(renderListingCard).join("")}
          <div class="summary-box"><p>${escapeHtml(inv.summary_paragraph || "")}</p></div>
        </section>`;

      const altListings = Array.isArray(alt.listings) ? alt.listings : [];
      const altHtml = `
        <section class="report-section">
          ${renderSectionHeading("03", alt.heading || "STRONGEST CURRENT ALTERNATIVE")}
          <p class="narrative">${escapeHtml(alt.intro_paragraph || "")}</p>
          ${altListings.map(renderListingCard).join("")}
          <div class="summary-box"><p>${escapeHtml(alt.summary_paragraph || "")}</p></div>
        </section>`;

      const cmpRows = Array.isArray(cmp.rows) ? cmp.rows : [];
      const cmpHeaders = cmpRows.map((r) => `<th>${escapeHtml(r.label || "")}</th>`).join("");
      const cmpTableHtml = `
        <table class="data-table comparison-table">
          <thead><tr><th></th>${cmpHeaders}</tr></thead>
          <tbody>
            <tr><td class="row-label">Asking Price</td>${cmpRows.map((r) => `<td>${escapeHtml(r.price || "")}</td>`).join("")}</tr>
            <tr><td class="row-label">Size</td>${cmpRows.map((r) => `<td>${escapeHtml(r.size || "")}</td>`).join("")}</tr>
            <tr><td class="row-label">AED/sqft</td>${cmpRows.map((r) => `<td>${escapeHtml(r.ppsf || "")}</td>`).join("")}</tr>
            <tr><td class="row-label">Beds/Baths</td>${cmpRows.map((r) => `<td>${escapeHtml(r.beds_baths || "")}</td>`).join("")}</tr>
            <tr><td class="row-label">Availability</td>${cmpRows.map((r) => `<td>${escapeHtml(r.availability || "")}</td>`).join("")}</tr>
          </tbody>
        </table>`;
      const cmpHtml = `
        <section class="report-section">
          ${renderSectionHeading("04", cmp.heading || "INVENTORY COMPARISON")}
          ${cmpTableHtml}
        </section>`;

      const stratSections = Array.isArray(strat.sections) ? strat.sections : [];
      const approachItems = Array.isArray(strat.approach_items) ? strat.approach_items : [];
      const stratHtml = `
        <section class="report-section">
          ${renderSectionHeading("05", "STRATEGIC ASSESSMENT | Advisory Summary")}
          <div class="market-context-box">
            <div class="market-context-label">MARKET CONTEXT</div>
            <p>${escapeHtml(strat.market_context || "")}</p>
          </div>
          ${stratSections.map((s) => `
            <div class="strat-section">
              <div class="strat-heading">${escapeHtml(s.heading || "")}</div>
              <p>${escapeHtml(s.body || "")}</p>
            </div>`).join("")}
          <div class="approach-heading">HOW I AM APPROACHING THIS FOR YOU</div>
          ${approachItems.map((item) => `
            <div class="approach-item">
              <div class="approach-num">${escapeHtml(item.number || "")}</div>
              <div class="approach-body">
                <div class="approach-action">${escapeHtml(item.action || "")}</div>
                <p>${escapeHtml(item.detail || "")}</p>
              </div>
            </div>`).join("")}
        </section>`;

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(report.title || "Client Property Report")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #17211c; margin: 0; background: #eef0ed; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 16px 56px; }
    .actions { margin-bottom: 16px; }
    button { min-height: 34px; padding: 0 16px; border: 0; border-radius: 6px; background: #0b6b57; color: #fff; font-weight: 700; cursor: pointer; font-size: 14px; }
    /* Header */
    .report-header { background: #fff; border-radius: 8px; padding: 28px 28px 22px; margin-bottom: 20px; border-bottom: 3px solid #0b6b57; }
    .report-title { font-size: 28px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 6px; color: #11231c; }
    .report-subtitle { font-size: 15px; font-weight: 400; color: #33423a; margin: 0 0 10px; }
    .report-meta { font-size: 12px; color: #7a8a80; letter-spacing: 0.05em; text-transform: uppercase; }
    /* Section heading */
    .report-section { background: #fff; border-radius: 8px; padding: 24px 28px; margin-bottom: 16px; }
    .section-heading { display: flex; align-items: baseline; gap: 8px; border-bottom: 2px solid #e4e8e5; padding-bottom: 10px; margin-bottom: 18px; }
    .section-num { font-size: 13px; color: #7a8a80; font-weight: 600; letter-spacing: 0.06em; white-space: nowrap; }
    .section-title { font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #11231c; }
    /* Tables */
    table.data-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    table.data-table thead tr { background: #0b6b57; color: #fff; }
    table.data-table thead th { padding: 9px 10px; text-align: left; font-weight: 600; letter-spacing: 0.04em; }
    table.data-table tbody tr:nth-child(even) { background: #f6f9f7; }
    table.data-table tbody td { padding: 8px 10px; border-bottom: 1px solid #e4e8e5; vertical-align: top; }
    /* Stats box */
    .stats-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #e4e8e5; border: 1px solid #e4e8e5; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
    .stat-cell { background: #fff; padding: 12px 14px; }
    .stat-label { font-size: 11px; color: #7a8a80; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
    .stat-value { font-size: 14px; font-weight: 600; color: #11231c; }
    /* Listing card */
    .listing-card { background: #fff; border: 1px solid #dde4e0; border-radius: 8px; padding: 18px 20px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); break-inside: avoid; }
    .listing-label { font-size: 11px; font-weight: 700; color: #0b6b57; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; font-variant: small-caps; }
    .listing-price { font-size: 24px; font-weight: 800; color: #11231c; margin-bottom: 4px; }
    .listing-tag { font-size: 13px; color: #7a8a80; font-style: italic; margin-bottom: 6px; }
    .listing-stats { font-size: 13px; color: #4a5a52; margin-bottom: 10px; letter-spacing: 0.01em; }
    .listing-narrative { font-size: 14px; line-height: 1.6; color: #33423a; margin: 0; }
    /* Summary box */
    .summary-box { background: #f0f7f4; border-left: 3px solid #0b6b57; border-radius: 4px; padding: 14px 16px; margin-top: 8px; }
    .summary-box p { font-size: 14px; line-height: 1.6; color: #33423a; margin: 0; }
    /* Comparison table */
    .comparison-table .row-label { font-weight: 700; color: #0b6b57; background: #f6f9f7; }
    /* Strategic section */
    .market-context-box { background: #f0f7f4; border: 1px solid #c3ddd5; border-radius: 6px; padding: 16px 18px; margin-bottom: 20px; }
    .market-context-label { font-size: 11px; font-weight: 700; color: #0b6b57; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
    .market-context-box p { font-size: 14px; line-height: 1.6; color: #33423a; margin: 0; }
    .strat-section { margin-bottom: 16px; }
    .strat-heading { font-size: 12px; font-weight: 700; color: #0b6b57; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
    .strat-section p { font-size: 14px; line-height: 1.6; color: #33423a; margin: 0; }
    .approach-heading { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #11231c; border-top: 1px solid #e4e8e5; padding-top: 16px; margin: 20px 0 14px; }
    .approach-item { display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-start; }
    .approach-num { font-size: 28px; font-weight: 800; color: #0b6b57; line-height: 1; min-width: 36px; }
    .approach-body { flex: 1; }
    .approach-action { font-size: 14px; font-weight: 700; color: #11231c; margin-bottom: 4px; }
    .approach-body p { font-size: 14px; line-height: 1.6; color: #33423a; margin: 0; }
    /* Narrative */
    p.narrative { font-size: 14px; line-height: 1.6; color: #33423a; margin: 0 0 8px; }
    /* Footer */
    .report-footer { text-align: center; font-size: 12px; color: #7a8a80; margin-top: 24px; padding: 12px 0; border-top: 1px solid #dde4e0; }
    /* Print */
    @media print {
      body { background: #fff; }
      main { max-width: 100%; padding: 0; }
      .actions { display: none; }
      .report-section, .listing-card, .report-header { box-shadow: none; border-color: #ccc; }
      .stats-box { background: #ccc; }
    }
  </style>
</head>
<body>
  <main>
    <div class="actions"><button onclick="window.print()">Save as PDF</button></div>
    <div class="report-header">
      <div class="report-title">${escapeHtml(report.title || "Client Property Report")}</div>
      <div class="report-subtitle">${escapeHtml(report.subtitle || "")}</div>
      <div class="report-meta">Prepared: ${escapeHtml(generatedAt)} &middot; Confidential</div>
    </div>
    ${txnHtml}
    ${invHtml}
    ${altHtml}
    ${cmpHtml}
    ${stratHtml}
    <div class="report-footer">${escapeHtml(report.footer || report.disclaimer || "")}</div>
  </main>
</body>
</html>`;
      saveSessionReport("client", html);
      writeReportWindow(reportWindow, html);
    }

    async function runClientReport() {
      if (clientReportOpened) {
        if (!reopenSessionReport("client", "Client report")) {
          error.hidden = false;
          error.textContent = "Client report was already opened, but this browser session no longer has the stored report. Run a new search or Build report again to create another.";
        }
        return;
      }
      const text = promptBox.value.trim();
      const token = currentApiToken();
      if (!text) { promptBox.focus(); return; }
      if (!token) { error.hidden = false; error.textContent = "Add and check an OpenAI API key first (AI key button above)."; return; }
      const built = lastBuiltReport;
      if (!built || !built.ranked_urls?.length) {
        error.hidden = false;
        error.textContent = "Run Build Report first, then create a client report.";
        return;
      }
      const rankedUrls = built.ranked_urls;
      const scenario = built.scenario;
      const reportWindow = openReportWindow("Client report", "Generating the client report. This window will update automatically.");
      if (!reportWindow) {
        error.hidden = false;
        error.textContent = "Popup blocked. Allow popups for this page to open the client report.";
        return;
      }
      clientReportButton.disabled = true;
      clientReportButton.textContent = "Writing…";
      error.hidden = true;
      aiPanel.hidden = false;
      aiPanel.textContent = "Writing a client-safe report from the built report shortlist...";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 240000);
      try {
        const res = await fetch("/api/client-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: built.prompt || text, purpose: built.purpose || purpose.value, scenario, listing_scope: built.listing_scope || listingScope.value, listing_communities: built.listing_communities || selectedListingCommunities(), market_scope: built.market_scope || currentMarketScope(), market_communities: built.market_communities || currentMarketCommunities(), api_key: token, limit: 6, ranked_urls: rankedUrls, built_matches: built.matches || [], built_report: { title: built.report_title || "", summary: built.client_response || "", market_read: built.ai?.market_read || "", conclusion: built.ai?.client_response || "" } }),
          signal: controller.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Client report failed");
        renderAiClientReport(data.client_report || {}, reportWindow);
        clientReportOpened = true;
        clientReportButton.disabled = false;
        clientReportButton.textContent = "Reopen client report";
        clientReportButton.classList.remove("step-ready");
        aiPanel.hidden = false;
        aiPanel.textContent = "Client report opened in a new tab.";
        wf4b?.classList.remove("active");
        wf4b?.classList.add("done");
      } catch (err) {
        error.hidden = false;
        error.textContent = err.name === "AbortError" ? "Client report timed out. Try fewer ranked results." : err.message;
        writeReportError(reportWindow, "Client report failed", error.textContent);
        aiPanel.hidden = true;
      } finally {
        clearTimeout(timeoutId);
        if (!clientReportOpened) {
          clientReportButton.disabled = false;
          clientReportButton.textContent = "Client report";
        }
      }
    }

    async function runAiReport({ buttonElement, buttonText, endpoint, progressStart, scenario, rankedUrls, candidateUrls, premiumCandidateUrls }) {
      const text = promptBox.value.trim();
      const token = currentApiToken();
      if (!text) { promptBox.focus(); return; }
      if (!token) { error.hidden = false; error.textContent = "Add and check an OpenAI API key first (AI key button above)."; return; }
      if (buttonElement) { buttonElement.disabled = true; buttonElement.textContent = "Thinking…"; }
      error.hidden = true;
      response.hidden = true;
      reportToolbar.hidden = true;
      aiPanel.hidden = false;
      const messages = [progressStart, "Adding relevant DXB market comps...", "Sending small batches to OpenAI...", "Ranking shortlist batches...", "Comparing batch winners with market comps...", "Building final enquiry report...", "Still working. This can take a couple of minutes..."];
      let msgIdx = 0;
      aiPanel.textContent = messages[0];
      const progressId = setInterval(() => { msgIdx = Math.min(msgIdx + 1, messages.length - 1); aiPanel.textContent = messages[msgIdx]; }, 7000);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, purpose: purpose.value, intent: intent.value, listing_scope: listingScope.value, listing_communities: selectedListingCommunities(), market_scope: currentMarketScope(), market_communities: currentMarketCommunities(), api_key: token, limit: 10, scenario, ranked_urls: rankedUrls || [], candidate_urls: candidateUrls || [], premium_candidate_urls: premiumCandidateUrls || [] }),
          signal: controller.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI feedback failed");
        render(data);
        aiPanel.hidden = false;
        aiPanel.innerHTML = `
          <section class="report-section"><h2>Market Read</h2><pre>${escapeHtml(data.ai.market_read || "No market read returned.")}</pre></section>
          <section class="report-section"><h2>Conclusion</h2><pre>${escapeHtml(data.ai.client_response || "No conclusion returned.")}</pre></section>`;
        return data;
      } catch (err) {
        error.hidden = false;
        error.textContent = err.name === "AbortError" ? "AI feedback timed out after 5 minutes. Try a narrower prompt." : err.message;
        aiPanel.hidden = true;
        return null;
      } finally {
        clearInterval(progressId);
        clearTimeout(timeoutId);
        if (buttonElement) { buttonElement.disabled = false; buttonElement.textContent = buttonText; }
      }
    }

    function fmtAed(n) {
      if (!Number.isFinite(n)) return "—";
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
      if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
      return n.toLocaleString();
    }

    async function runEstimate() {
      const text = promptBox.value.trim();
      const token = currentApiToken();
      if (!text) { promptBox.focus(); return; }
      if (!token) { error.hidden = false; error.textContent = "Add and check an OpenAI API key first (AI key button above)."; return; }
      estimateButton.disabled = true;
      estimateButton.textContent = "Estimating…";
      error.hidden = true;
      estimatePanel.hidden = false;
      estimatePanel.innerHTML = `<div style="color:#6d3bbf;font-size:13px;">Analysing comparables and generating estimate…</div>`;
      // Pass selected listing communities so the estimator can widen the comp pool.
      // The user can also name communities directly in the prompt.
      const extraComms = selectedListingCommunities().filter(c => c !== "Arabian Ranches 2");
      try {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            purpose: purpose.value,
            api_key: token,
            extra_communities: extraComms,
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Estimate failed");
        const est = data.estimate || {};
        const confidence = est.confidence ? `<span style="font-size:11px;color:#6d3bbf;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Confidence: ${escapeHtml(est.confidence)}</span>` : "";
        const isRent = data.purpose === "rent";
        const currSuffix = isRent ? "/yr" : "";
        const rangeHtml = (Number.isFinite(est.low) && Number.isFinite(est.mid) && Number.isFinite(est.high)) ? `
          <div class="estimate-range">
            <div class="estimate-band low">
              <div class="band-label">Low</div>
              <div class="band-price">AED ${fmtAed(est.low)}${currSuffix}</div>
              <div class="band-note">${escapeHtml(est.rationale?.low || "")}</div>
            </div>
            <div class="estimate-band mid">
              <div class="band-label">Mid (anchor)</div>
              <div class="band-price">AED ${fmtAed(est.mid)}${currSuffix}</div>
              <div class="band-note">${escapeHtml(est.rationale?.mid || "")}</div>
            </div>
            <div class="estimate-band high">
              <div class="band-label">High</div>
              <div class="band-price">AED ${fmtAed(est.high)}${currSuffix}</div>
              <div class="band-note">${escapeHtml(est.rationale?.high || "")}</div>
            </div>
          </div>` : `<p style="color:#c00;font-size:13px;">Could not produce a price range — ${escapeHtml(est.parse_error || est.raw || "no data")}</p>`;
        const premiums = (est.premium_factors || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");
        const discounts = (est.discount_factors || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");
        const risks = (est.key_risks || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");
        // Data quality tip: if type wasn't found in the specified communities, tell the user which have it
        const typeAvailableIn = data.type_available_in || [];
        const crossWarning = data.cross_community_warning || "";
        let dataTipHtml = "";
        if (crossWarning) {
          const tipComms = typeAvailableIn.slice(0, 5);
          const suggestionHtml = tipComms.length
            ? `<br>Try adding <strong>${tipComms.join(", ")}</strong> to your prompt, or tick them in the scope panel.`
            : "";
          dataTipHtml = `<p class="estimate-meta" style="color:#b45309;margin-top:4px;">&#9888; ${escapeHtml(crossWarning)}${suggestionHtml}</p>`;
        }
        const comps = (data.sample_comparables || []);
        const compRows = comps.map(c => `<tr>
          <td>${escapeHtml(c.community || "")}</td>
          <td>${escapeHtml(c.type || "")}</td>
          <td>${c.beds || "—"}</td>
          <td>${c.bua_sqft ? c.bua_sqft.toLocaleString() : "—"}</td>
          <td>${c.plot_sqft ? c.plot_sqft.toLocaleString() : "—"}</td>
          <td>${c.price ? "AED " + fmtAed(c.price) + (isRent ? "/yr" : "") : "—"}</td>
          <td>${c.price_per_sqft && !isRent ? "AED " + Math.round(c.price_per_sqft) : "—"}</td>
        </tr>`).join("");
        const compsHtml = compRows ? `
          <details class="estimate-comps">
            <summary>Comparable listings used (${comps.length})</summary>
            <table>
              <tr><th>Community</th><th>Type</th><th>Beds</th><th>BUA sqft</th><th>Plot sqft</th><th>Price</th>${isRent ? "" : "<th>PPSF</th>"}</tr>
              ${compRows}
            </table>
          </details>` : "";
        const purposeLabel = isRent ? "Rental" : "Sale";
        estimatePanel.innerHTML = `
          <h2>Property Value Estimate <span style="font-size:12px;font-weight:400;color:#6d3bbf;">${purposeLabel}</span></h2>
          <p class="estimate-meta">Based on <strong>${data.comparable_count || 0}</strong> comparable active listings · ${escapeHtml(data.match_basis || "")} · ${escapeHtml((data.all_communities || [data.community]).join(" / ") || "")} ${data.villa_type || ""} ${data.bedrooms ? data.bedrooms + " bed" : ""}</p>
          ${dataTipHtml}
          ${confidence}
          ${rangeHtml}
          ${premiums ? `<div class="estimate-section-title">Premium factors</div><ul class="estimate-list">${premiums}</ul>` : ""}
          ${discounts ? `<div class="estimate-section-title">Discount factors</div><ul class="estimate-list">${discounts}</ul>` : ""}
          ${risks ? `<div class="estimate-section-title">Key risks & unknowns</div><ul class="estimate-list estimate-risks">${risks}</ul>` : ""}
          ${est.data_basis ? `<p class="estimate-meta" style="margin-top:6px;">${escapeHtml(est.data_basis)}</p>` : ""}
          ${compsHtml}`;
      } catch (err) {
        error.hidden = false;
        error.textContent = err.message;
        estimatePanel.hidden = true;
      } finally {
        estimateButton.disabled = false;
        estimateButton.textContent = "Estimate value";
      }
    }

    async function runOpportunityScan(scanPurpose = "sale", buttonEl = oppScanSaleBtn) {
      const token = currentApiToken();
      if (!token) { error.hidden = false; error.textContent = "Add and check an OpenAI API key first (AI key button above)."; return; }
      buttonEl.disabled = true;
      buttonEl.textContent = "Scanning…";
      error.hidden = true;
      opportunityPanel.hidden = false;
      opportunityPanel.innerHTML = `<div style="color:#c0411a;font-size:13px;">Scanning database for poachable listings…</div>`;

      try {
        const res = await fetch("/api/opportunity-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: token,
            purpose_filter: scanPurpose,
            limit: 15,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Opportunity scan failed.");

        const opps = data.opportunities || [];
        const scanNote = data.scan_note || "";
        const scannedCount = data.total_active_scanned || 0;
        const candidateCount = data.candidates_sent_to_ai || 0;

        const typeLabels = {
          stale_overpriced: "Stale + Overpriced",
          stale_listing: "Stale Listing",
          overpriced: "Overpriced",
          weak_listing: "Weak Listing",
          motivated_seller: "Motivated Seller",
        };

        function fmtPrice(price, currency) {
          if (!price) return "—";
          const n = Number(price);
          const suffix = currency === "AED/yr" ? "/yr" : "";
          if (n >= 1_000_000) return "AED " + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M" + suffix;
          if (n >= 1_000) return "AED " + (n / 1_000).toFixed(0) + "K" + suffix;
          return "AED " + n.toLocaleString() + suffix;
        }

        function stalePill(days) {
          if (days == null) return "";
          if (days >= 60) return `<span class="opp-pill stale">${days}d on market</span>`;
          if (days >= 30) return `<span class="opp-pill stale">${days}d on market</span>`;
          return `<span class="opp-pill">${days}d on market</span>`;
        }

        function pricePill(pct, price, currency) {
          if (!price) return "";
          const priceStr = fmtPrice(price, currency);
          if (pct != null && pct > 5) return `<span class="opp-pill overpriced">${priceStr} (+${pct}% vs median)</span>`;
          return `<span class="opp-pill">${priceStr}</span>`;
        }

        function agentPills(opp) {
          const pills = [];
          if (opp.agent_is_superagent || /superagent/i.test(opp.agent_badge || "")) {
            pills.push(`<span class="opp-pill agent-strong">SuperAgent</span>`);
          }
          if (opp.agent_rating) {
            const reviews = opp.agent_review_count != null ? ` &middot; ${opp.agent_review_count} ratings` : "";
            pills.push(`<span class="opp-pill agent-rating">${Number(opp.agent_rating).toFixed(1)} star${reviews}</span>`);
          } else {
            pills.push(`<span class="opp-pill agent-weak">No visible rating</span>`);
          }
          if (opp.agent_closed_deals != null) {
            pills.push(`<span class="opp-pill">${opp.agent_closed_deals} closed deals</span>`);
          }
          if (opp.agent_response_time) {
            pills.push(`<span class="opp-pill">${escapeHtml(opp.agent_response_time)} response</span>`);
          }
          return pills.join("");
        }

        const cards = opps.map(opp => {
          const score = opp.opportunity_score || 0;
          const typeLabel = typeLabels[opp.opportunity_type] || (opp.opportunity_type || "Opportunity").replace(/_/g, " ");
          const beds = opp.bedrooms ? `${opp.bedrooms} bed · ` : "";
          const sqft = opp.property_size_sqft ? `${opp.property_size_sqft.toLocaleString()} sqft` : "";
          const statsLine = [beds + opp.community, opp.predicted_type, sqft].filter(Boolean).join(" · ");

          return `
  <div class="opp-card">
    <div class="opp-card-header">
      <div class="opp-score-badge">${score}</div>
      <div class="opp-headline">${escapeHtml(opp.headline || "Opportunity")}</div>
    </div>
    <div><span class="opp-type-badge">${escapeHtml(typeLabel)}</span></div>
    <div class="opp-stats">
      ${stalePill(opp.days_on_market)}
      ${pricePill(opp.price_vs_median_pct, opp.price, opp.price_currency)}
      ${statsLine ? `<span class="opp-pill">${escapeHtml(statsLine)}</span>` : ""}
      ${agentPills(opp)}
    </div>
    <div class="opp-reason">${escapeHtml(opp.reason || "")}</div>
    <div class="opp-approach">→ ${escapeHtml(opp.approach || "")}</div>
    ${opp.talking_point ? `<div class="opp-talking-point">"${escapeHtml(opp.talking_point)}"</div>` : ""}
    <div class="opp-agent">
      <strong>${escapeHtml(opp.agent_name || "Unknown agent")}</strong>
      ${opp.agency_name ? ` · ${escapeHtml(opp.agency_name)}` : ""}
    </div>
  </div>`;
        }).join("");

        const purposeLabel = scanPurpose === "sale" ? "Sales" : scanPurpose === "rent" ? "Rentals" : "All";
        opportunityPanel.innerHTML = `
  <h2>Opportunity Scan <span style="font-size:12px;font-weight:400;color:#c0411a;">${purposeLabel} · ${opps.length} leads identified</span></h2>
  <p class="opp-scan-note">Scanned ${scannedCount} active listings · ${candidateCount} candidates analysed${scanNote ? " · " + escapeHtml(scanNote) : ""}</p>
  <div class="opp-grid">${cards || "<p style='color:var(--muted);font-size:13px;'>No strong opportunities found — try running a fresh scrape to update listing data.</p>"}</div>`;
      } catch (err) {
        error.hidden = false;
        error.textContent = err.message;
        opportunityPanel.hidden = true;
      } finally {
        buttonEl.disabled = false;
        buttonEl.textContent = scanPurpose === "rent" ? "Rental opportunities" : "Sales opportunities";
      }
    }

    button.addEventListener("click", runSearch);
    quickButton.addEventListener("click", runQuickQuery);
    clearButton.addEventListener("click", clearPage);
    printReportButton.addEventListener("click", () => window.print());
    checkButton?.addEventListener("click", checkOpenAiKey);
    ownerButton.addEventListener("click", lookupOwner);
    ownerUrlBox.addEventListener("keydown", (e) => { if (e.key === "Enter") lookupOwner(); });
    results.addEventListener("click", handleListingActionClick);
    premiumCompromiseResults.addEventListener("click", handleListingActionClick);
    aboveBudgetResults.addEventListener("click", handleListingActionClick);
    fallbackResults.addEventListener("click", handleListingActionClick);
    aiPanel.addEventListener("click", handleListingActionClick);
    aiButton.addEventListener("click", () => { ensureApiKeyVisible(); runAiFeedback(); });
    estimateButton.addEventListener("click", () => { ensureApiKeyVisible(); runEstimate(); });
    oppScanSaleBtn?.addEventListener("click", () => { ensureApiKeyVisible(); runOpportunityScan("sale", oppScanSaleBtn); });
    oppScanRentBtn?.addEventListener("click", () => { ensureApiKeyVisible(); runOpportunityScan("rent", oppScanRentBtn); });
    aiReportButton.addEventListener("click", () => { ensureApiKeyVisible(); runBuildReport(); });
    agentPlanButton.addEventListener("click", () => { ensureApiKeyVisible(); runAgentPlan(); });
    clientReportButton.addEventListener("click", () => { ensureApiKeyVisible(); runClientReport(); });
    scenarioButtons.forEach((btn) => btn.addEventListener("click", () => { ensureApiKeyVisible(); runScenario(btn.dataset.scenario, btn); }));
    promptBox.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runSearch(); });
    promptBox.addEventListener("input", updateGuidedDemo);
    demoPromptSelect?.addEventListener("change", applyDemoPrompt);
    guidedDemoClose?.addEventListener("click", () => {
      guideDismissed = true;
      if (guidedDemo) guidedDemo.hidden = true;
      clearGuideFocus();
    });
    introModalClose?.addEventListener("click", closeIntroModal);
    introModalPrimary?.addEventListener("click", closeIntroModal);
    introModal?.addEventListener("click", (event) => {
      if (event.target?.hasAttribute("data-intro-close")) closeIntroModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && introModal && !introModal.hidden) closeIntroModal();
    });

    // Set initial state on page load
    setAiScenarioAvailability("auto");
    setWorkflowStep(0);
    showIntroModal();
