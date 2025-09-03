  
  // --- Utilidades de código NCM ---
  const onlyDigits = s => (s ?? '').toString().replace(/\D+/g, '');
  const catKey     = s => onlyDigits(s).padEnd(2,'0').slice(0,2); // capítulo (2)
  const subKey     = s => onlyDigits(s).padEnd(4,'0').slice(0,4); // subposição (4)
  const codeLen    = s => onlyDigits(s).length;

  // formata dd/mm/aaaa já vem pronto; se vier ISO, converte
  function normDate(x){
    if(!x) return '';
    const str = String(x);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    const d = new Date(str);
    if (isNaN(d)) return str;
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  async function loadData(){
    const res = await fetch('../data/ncm.json');
    if(!res.ok) throw new Error('Falha ao carregar ncm.json');
    /** @type {{Codigo:string,Descricao:string,Data_Inicio:string,Data_Fim:string,Ato_Legal_Inicio:string,Numero:string|number,Ano:string|number}[]} */
    const data = await res.json();

    // Monta estrutura: capítulos → subposições → itens
    /** @type {Map<string, {meta?:any, subs: Map<string,{meta?:any, items:any[]}>}>} */
    const chapters = new Map();

    for(const row of data){
      const code = row.Codigo ?? '';
      const dlen = codeLen(code);
      if (dlen === 0) continue;

      const ck = catKey(code);
      const sk = subKey(code);

      if(!chapters.has(ck)) chapters.set(ck, { meta: undefined, subs: new Map() });
      const chap = chapters.get(ck);

      if(!chap.subs.has(sk)) chap.subs.set(sk, { meta: undefined, items: [] });
      const sub = chap.subs.get(sk);

      // Define meta do capítulo quando o código for nível 2 dígitos
      if (dlen === 2) chap.meta = row;

      // Define meta da subposição quando o código for nível 4 dígitos
      if (dlen === 4) sub.meta = row;

      // Distribui itens:
      // - Se for nivel 2: trata como "item do capítulo" (pouco comum, mas exibiremos no topo da sub-lista)
      // - Se for nivel 4: fica como "cabeçalho" da sub; ainda assim listamos como item para mostrar as datas
      // - Se >4: itens detalhados pertencem à subposição (4)
      sub.items.push(row);
    }

    return chapters;
  }

  function render(chapters, query=''){
    const app = document.getElementById('app');
    app.innerHTML = '';

    // Filtro simples por código/descrição
    const q = query.trim().toLowerCase();

    // Ordena capítulos numericamente
    const chapKeys = Array.from(chapters.keys()).sort((a,b)=>a.localeCompare(b, 'pt-BR', {numeric:true}));

    for(const ck of chapKeys){
      const chap = chapters.get(ck);
      const chapCode = chap?.meta?.Codigo ?? ck;
      const chapDesc = chap?.meta?.Descricao ?? '(sem descrição do capítulo)';

      // Filtragem: se busca não casa com nenhum item do capítulo, oculta
      const allSubData = Array.from(chap.subs.values()).flatMap(s => s.items);
      const chapMatches = q ? allSubData.some(r =>
        String(r.Codigo).toLowerCase().includes(q) ||
        String(r.Descricao).toLowerCase().includes(q)
      ) : true;
      if (!chapMatches) continue;

      // count de itens (exibidos, pós-filtro)
      const visibleItems = q ? allSubData.filter(r =>
        String(r.Codigo).toLowerCase().includes(q) ||
        String(r.Descricao).toLowerCase().includes(q)
      ).length : allSubData.length;

      const $details = document.createElement('details');
      $details.open = q.length > 0; // abre automaticamente quando filtrado

      const $summary = document.createElement('summary');
      $summary.innerHTML = `
        <span class="code-chip">${ck}</span>
        <span>${chapDesc}</span>
        <span class="count">(${visibleItems})</span>
      `;
      $details.appendChild($summary);

      const $wrap = document.createElement('div');
      $wrap.className = 'sub-w';

      // Ordena subposições
      const subKeys = Array.from(chap.subs.keys()).sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));

      for(const sk of subKeys){
        const sub = chap.subs.get(sk);

        // Filtra itens dessa subposição
        const filtered = q ? sub.items.filter(r =>
          String(r.Codigo).toLowerCase().includes(q) ||
          String(r.Descricao).toLowerCase().includes(q)
        ) : sub.items.slice();

        if(filtered.length === 0) continue;

        // Cabeçalho da sub (se existir uma linha de 4 dígitos)
        const subMeta = sub.meta;
        const subTitle = subMeta?.Descricao ?? '(Subposição sem título)';
        const subCode  = subMeta?.Codigo ?? sk.replace(/^(\d{2})(\d{2}).*$/, '$1.$2');

        const $sub = document.createElement('section');
        $sub.className = 'sub';
        $sub.innerHTML = `
          <h4>
            <span class="code-chip">${subCode}</span>
            <span>${subTitle}</span>
          </h4>
        `;

        const $list = document.createElement('div');
        $list.className = 'items';

        // Ordena itens por código com comparação numérica
        filtered.sort((a,b)=>onlyDigits(a.Codigo).localeCompare(onlyDigits(b.Codigo),'pt-BR',{numeric:true}));

        for(const it of filtered){
          const $item = document.createElement('div');
          $item.className = 'item';
          $item.innerHTML = `
            <div class="i-code">${it.Codigo}</div>
            <div class="i-desc">
              <div>${it.Descricao || ''}</div>
              <div class="i-meta">
                ${it.Data_Inicio ? `<span class="pill">Início: ${normDate(it.Data_Inicio)}</span>` : ''}
                ${it.Data_Fim ? `<span class="pill">Fim: ${normDate(it.Data_Fim)}</span>` : ''}
                ${it.Ato_Legal_Inicio ? `<span class="pill">Ato: ${it.Ato_Legal_Inicio}</span>` : ''}
                ${it.Numero ? `<span class="pill">Nº ${it.Numero}</span>` : ''}
                ${it.Ano ? `<span class="pill">${it.Ano}</span>` : ''}
              </div>
            </div>
          `;
          $list.appendChild($item);
        }

        if($list.children.length === 0){
          const $empty = document.createElement('div');
          $empty.className = 'empty';
          $empty.textContent = 'Sem itens para esta subposição.';
          $sub.appendChild($empty);
        }else{
          $sub.appendChild($list);
        }

        $wrap.appendChild($sub);
      }

      if($wrap.children.length === 0){
        const $empty = document.createElement('div');
        $empty.className = 'empty';
        $empty.textContent = 'Sem subposições visíveis neste capítulo.';
        $wrap.appendChild($empty);
      }

      $details.appendChild($wrap);
      app.appendChild($details);
    }

    if(app.children.length === 0){
      app.innerHTML = `<div class="empty">Nada encontrado. Tente outro termo de busca.</div>`;
    }
  }

  (async function init(){
    try{
      const chapters = await loadData();
      render(chapters);

      const $q = document.getElementById('q');
      $q.addEventListener('input', e => render(chapters, e.target.value));
    }catch(err){
      document.getElementById('app').innerHTML =
        `<div class="empty">Erro ao carregar dados: ${err.message}</div>`;
    }
  })();
