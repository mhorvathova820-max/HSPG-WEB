'use strict';

(() => {
  const tokenInput = document.querySelector('#admin-token');
  const connectButton = document.querySelector('#connect-button');
  const statusMessage = document.querySelector('#connection-status');
  const requestList = document.querySelector('#request-list');
  const contractList = document.querySelector('#contract-list');
  const auditList = document.querySelector('#audit-list');
  const toast = document.querySelector('#toast');
  const geoButton = document.querySelector('#geo-draft-button');
  const geoEstimate = document.querySelector('#geo-estimate');
  const agentChoice = document.querySelector('#agent-choice');
  const agentInput = document.querySelector('#agent-input');
  const agentConsent = document.querySelector('#agent-consent');
  const agentButton = document.querySelector('#agent-run-button');
  let token = '';
  let refreshTimer = null;
  let toastTimer = null;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
    if (document.querySelector('#haptics-enabled')?.checked && navigator.vibrate) navigator.vibrate(25);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      cache: 'no-store',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: 'Bearer ' + token,
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Požadavek selhal (${response.status}).`);
    return result;
  }

  function makeCard(title, detail, actionText, action) {
    const card = document.createElement('article');
    card.className = 'request-card';
    const heading = document.createElement('h3');
    heading.textContent = title;
    card.append(heading);
    for (const line of detail) {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      card.append(paragraph);
    }
    if (actionText) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = actionText;
      button.addEventListener('click', action);
      card.append(button);
    }
    return card;
  }

  async function approveContract(request) {
    if (!window.confirm(`Potvrdit ruční kontrolu návrhu pro kalkulaci ${request.estimateId}? Dokument nebude podepsán ani odeslán.`)) return;
    try {
      await api(`/api/admin/contracts/${encodeURIComponent(request.estimateId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ confirmation: true }),
      });
      notify('Kontrola zaznamenána; žádný dokument nebyl podepsán ani odeslán.');
      await refreshOverview();
    } catch (error) {
      notify(error.message);
    }
  }

  function renderOverview(data) {
    requestList.replaceChildren();
    contractList.replaceChildren();
    const selectedEstimateId = geoEstimate.value;
    geoEstimate.replaceChildren();
    const selectPrompt = document.createElement('option');
    selectPrompt.value = '';
    selectPrompt.textContent = data.requests.length ? 'Vyberte evidovanou kalkulaci' : 'Nejsou dostupné žádné kalkulace';
    geoEstimate.append(selectPrompt);
    for (const item of data.requests) {
      const option = document.createElement('option');
      option.value = item.estimateId;
      option.textContent = `${item.address} · ${new Date(item.createdAt).toLocaleDateString('cs-CZ')}`;
      geoEstimate.append(option);
    }
    geoEstimate.disabled = false;
    if (data.requests.some((item) => item.estimateId === selectedEstimateId)) geoEstimate.value = selectedEstimateId;
    if (!data.requests.length) {
      requestList.innerHTML = '<p class="empty-state">Zatím nejsou k dispozici žádné modelové kalkulace.</p>';
      contractList.innerHTML = '<p class="empty-state">Žádné návrhy smluv k ruční kontrole.</p>';
      return;
    }
    for (const item of data.requests) {
      const price = new Intl.NumberFormat('cs-CZ').format(item.estimatedPriceCzk);
      requestList.append(makeCard(
        item.address,
        [
          `ID kalkulace: ${item.estimateId}`,
          `Vytvořeno: ${new Date(item.createdAt).toLocaleString('cs-CZ')}`,
          `Orientační modelová částka: ${price} Kč`,
          `Typ: ${item.estimateType}`,
        ],
        null,
        null,
      ));
      if (item.contractStatus === 'awaiting-manual-review') {
        contractList.append(makeCard(
          item.address,
          [`ID kalkulace: ${item.estimateId}`, 'Stav: čeká na ruční kontrolu návrhu.'],
          'SCHVÁLIT SMLOUVU K PODPISU',
          () => approveContract(item),
        ));
      } else if (item.contractStatus === 'approved-for-signature-provider-review') {
        contractList.append(makeCard(
          item.address,
          [`ID kalkulace: ${item.estimateId}`, 'Ruční kontrola je zaznamenána; podpis ani odeslání neproběhly.'],
          null,
          null,
        ));
      }
    }
    if (!contractList.childElementCount) {
      contractList.innerHTML = '<p class="empty-state">Žádné návrhy smluv k ruční kontrole.</p>';
    }
  }

  async function refreshOverview() {
    const overview = await api('/api/admin/overview');
    renderOverview(overview);
  }

  async function loadAgents() {
    const result = await api('/api/admin/agents');
    agentChoice.replaceChildren();
    for (const agent of result.agents) {
      const option = document.createElement('option');
      option.value = agent.id;
      option.textContent = `${agent.name} — ${agent.providerConfigured ? 'Claude připraveno' : 'Claude API nenakonfigurováno'}`;
      option.disabled = !agent.providerConfigured;
      agentChoice.append(option);
    }
    agentChoice.disabled = false;
    updateAgentButton();
  }

  async function runAgent() {
    const input = agentInput.value.trim();
    if (!input || !agentConsent.checked) {
      notify('Vložte text a potvrďte předání poskytovateli.');
      return;
    }
    agentButton.disabled = true;
    document.querySelector('#agent-status').textContent = 'Požadavek byl ručně spuštěn; čekám na Claude API…';
    document.querySelector('#agent-output').hidden = true;
    try {
      const result = await api(`/api/admin/agents/${encodeURIComponent(agentChoice.value)}/run`, {
        method: 'POST',
        body: JSON.stringify({ input, externalProcessingConsent: true }),
      });
      document.querySelector('#agent-output').textContent = result.draft;
      document.querySelector('#agent-output').hidden = false;
      document.querySelector('#agent-status').textContent =
        `Návrh od ${result.provider} (${result.model}). Vyžaduje lidskou kontrolu; není schválen ani publikován. Otisk vstupu: ${result.promptSha256}.`;
      notify('Návrh připraven; nebyl odeslán ani publikován.');
      agentInput.value = '';
      agentConsent.checked = false;
    } catch (error) {
      document.querySelector('#agent-status').textContent = error.message;
    } finally {
      updateAgentButton();
    }
  }

  async function loadAudit() {
    try {
      const result = await api('/api/admin/audit-log?limit=50');
      auditList.replaceChildren();
      if (!result.records.length) {
        auditList.innerHTML = '<li class="empty-state">Auditní soubor zatím nemá žádné záznamy.</li>';
        return;
      }
      for (const record of result.records) {
        const item = document.createElement('li');
        item.textContent = `${record.timestamp} · ${record.type} · ${record.outcome}`;
        auditList.append(item);
      }
    } catch (error) {
      auditList.replaceChildren();
      const item = document.createElement('li');
      item.className = 'empty-state';
      item.textContent = error.message;
      auditList.append(item);
    }
  }

  async function prepareGeoDraft() {
    const estimateId = geoEstimate.value;
    if (!estimateId || !document.querySelector('#work-confirmed').checked || !document.querySelector('#campaign-consent').checked) {
      notify('Potvrďte aktivní zakázku i souhlas s přípravou návrhu.');
      return;
    }
    if (!navigator.geolocation) {
      notify('Toto zařízení neposkytuje geolokaci.');
      return;
    }
    geoButton.disabled = true;
    document.querySelector('#geo-status').textContent = 'Čekám na jednorázové oprávnění k poloze zařízení…';
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const result = await api('/api/admin/geo-shield/draft', {
          method: 'POST',
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            estimateId,
            workConfirmed: true,
            consent: true,
          }),
        });
        document.querySelector('#geo-status').textContent =
          `Návrh připraven pro okruh ${result.campaign.meta.radiusKm} km. Nebyl odeslán do reklamních systémů.`;
        notify('Připraven pouze návrh kampaně; nic nebylo spuštěno.');
      } catch (error) {
        document.querySelector('#geo-status').textContent = error.message;
      } finally {
        geoButton.disabled = false;
      }
    }, (error) => {
      const reason = error.code === error.PERMISSION_DENIED
        ? 'Přístup k poloze byl odmítnut.'
        : 'Poloha zařízení není dostupná.';
      document.querySelector('#geo-status').textContent = reason;
      geoButton.disabled = false;
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
  }

  function disconnect() {
    token = '';
    clearInterval(refreshTimer);
    refreshTimer = null;
    document.querySelector('#refresh-button').disabled = true;
    document.querySelector('#audit-button').disabled = true;
    geoButton.disabled = true;
    geoEstimate.disabled = true;
    agentChoice.disabled = true;
    agentButton.disabled = true;
    statusMessage.textContent = 'Odpojeno.';
  }

  connectButton.addEventListener('click', async () => {
    token = tokenInput.value.trim();
    if (!token) {
      statusMessage.textContent = 'Vložte administrátorský JWT.';
      return;
    }
    connectButton.disabled = true;
    try {
      await refreshOverview();
      await loadAgents();
      statusMessage.textContent = 'Správce ověřen. Přehled se obnovuje každých 15 sekund.';
      document.querySelector('#refresh-button').disabled = false;
      document.querySelector('#audit-button').disabled = false;
      geoEstimate.disabled = false;
      updateGeoButton();
      clearInterval(refreshTimer);
      refreshTimer = setInterval(() => {
        refreshOverview().catch((error) => {
          statusMessage.textContent = error.message;
          disconnect();
        });
      }, 15000);
      tokenInput.value = '';
      notify('Administrátorské spojení navázáno.');
    } catch (error) {
      disconnect();
      statusMessage.textContent = error.message;
      token = '';
      tokenInput.value = '';
    } finally {
      connectButton.disabled = false;
    }
  });

  document.querySelector('#refresh-button').addEventListener('click', () => {
    refreshOverview().then(() => notify('Přehled byl obnoven.')).catch((error) => {
      statusMessage.textContent = error.message;
      disconnect();
    });
  });
  document.querySelector('#audit-button').addEventListener('click', loadAudit);
  geoButton.addEventListener('click', prepareGeoDraft);
  function updateGeoButton() {
    geoButton.disabled = !token || !geoEstimate.value ||
      !document.querySelector('#work-confirmed').checked ||
      !document.querySelector('#campaign-consent').checked;
  }
  geoEstimate.addEventListener('change', updateGeoButton);
  document.querySelector('#work-confirmed').addEventListener('change', updateGeoButton);
  document.querySelector('#campaign-consent').addEventListener('change', updateGeoButton);
  function updateAgentButton() {
    agentButton.disabled = !token || !agentChoice.value ||
      agentChoice.selectedOptions[0]?.disabled ||
      !agentInput.value.trim() || !agentConsent.checked;
  }
  agentChoice.addEventListener('change', updateAgentButton);
  agentInput.addEventListener('input', updateAgentButton);
  agentConsent.addEventListener('change', updateAgentButton);
  agentButton.addEventListener('click', runAgent);
  window.addEventListener('pagehide', disconnect);

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      statusMessage.textContent = 'PWA offline registrace není dostupná; bezpečné administrační API zůstává online-only.';
    });
  }
})();
