// app.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    themeBtn.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            htmlEl.setAttribute('data-theme', 'light');
        } else {
            htmlEl.setAttribute('data-theme', 'dark');
        }
    });

    // 2. Modal Logic for Add/Edit Events
    let currentItem = null;
    let currentCallback = null;

    const modal = document.getElementById('event-modal');
    const inputTitle = document.getElementById('event-text');
    const inputType = document.getElementById('event-type');
    const inputStart = document.getElementById('event-start');
    const inputEnd = document.getElementById('event-end');
    const groupEnd = document.getElementById('group-end-date');
    const modalTitle = document.getElementById('modal-title');

    // Toggle end date input based on type
    inputType.addEventListener('change', (e) => {
        groupEnd.style.display = e.target.value === 'range' ? 'flex' : 'none';
    });

    document.getElementById('event-ongoing').addEventListener('change', (e) => {
        document.getElementById('event-end').disabled = e.target.checked;
        if (e.target.checked) document.getElementById('event-end').value = '';
    });

    function openModal(item, callback, title) {
        currentItem = item;
        currentCallback = callback;
        modalTitle.innerText = title;
        
        inputTitle.value = item.content || '';
        
        // Determine type based on existing data
        const isRange = item.type === 'range' || (item.start && item.end);
        inputType.value = isRange ? 'range' : 'point';
        groupEnd.style.display = isRange ? 'flex' : 'none';

        // Format dates for the HTML <input type="date">
        const formatForInput = (d) => {
            if (!d) return '';
            const date = new Date(d);
            // offset to local timezone to prevent off-by-one day errors in input
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            return date.toISOString().split('T')[0];
        };

        inputStart.value = formatForInput(item.start) || formatForInput(new Date());
        inputEnd.value = formatForInput(item.end);

        const chkOngoing = document.getElementById('event-ongoing');
        chkOngoing.checked = !!item.ongoing;
        inputEnd.disabled = !!item.ongoing;
        if (item.ongoing) inputEnd.value = '';

        modal.classList.remove('hidden');
        inputTitle.focus();
    }

    document.getElementById('modal-cancel').onclick = () => {
        modal.classList.add('hidden');
        if (currentCallback) currentCallback(null); // Cancela a operação
    };

    document.getElementById('modal-save').onclick = () => {
        if (!inputTitle.value || !inputStart.value) {
            alert('Por favor, preencha o título e a data de início.');
            return;
        }

        currentItem.content = inputTitle.value;
        // Setting time to noon (12:00:00) keeps dates stable across timezones
        currentItem.start = new Date(inputStart.value + 'T12:00:00'); 

        if (inputType.value === 'range') {
            currentItem.type = 'range';
            const isOngoing = document.getElementById('event-ongoing').checked;
            currentItem.ongoing = isOngoing;
            
            if (isOngoing) {
                const today = new Date();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                currentItem.end = new Date(`${today.getFullYear()}-${mm}-${dd}T12:00:00`); 
            } else if (inputEnd.value) {
                currentItem.end = new Date(inputEnd.value + 'T12:00:00');
            } else {
                currentItem.end = new Date(currentItem.start.getTime() + (1000 * 60 * 60 * 24 * 365)); 
            }
        } else {
            currentItem.type = 'point';
            currentItem.end = undefined;
            currentItem.ongoing = false;
        }

        // Automatic Color Mapping based on group name
        if (!currentItem.className) {
            const grp = groups.get(currentItem.group);
            if (grp && grp.content) {
                const name = grp.content.toLowerCase();
                if (name.includes('vida')) currentItem.className = 'cat-vida';
                else if (name.includes('estado')) currentItem.className = 'cat-estado';
                else if (name.includes('saúd') || name.includes('saud')) currentItem.className = 'cat-saude';
                else if (name.includes('evento')) currentItem.className = 'cat-eventos';
                else if (name.includes('patrim')) currentItem.className = 'cat-patrimonio';
                else currentItem.className = 'cat-diversos';
            }
        }

        modal.classList.add('hidden');
        if (currentCallback) currentCallback(currentItem);
    };

    // 3. Initialize Vis-Timeline
    const container = document.getElementById('timeline-container');

    // 3.1 LocalStorage Persistence
    const savedData = localStorage.getItem('timelineData');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed.groups && parsed.items) {
                groups.clear();
                items.clear();
                groups.add(parsed.groups);
                items.add(parsed.items);
            }
        } catch (e) {
            console.error("Erro ao ler localStorage", e);
        }
    }

    // 3.2 Pré-processamento dos itens: Tooltips + Ongoing (Hoje)
    function preprocessAndSave() {
        const updates = [];
        items.forEach(item => {
            let updateObj = { id: item.id };
            let hasChanges = false;
            
            const startStr = item.start ? new Date(item.start).toLocaleDateString('pt-BR') : '';
            let endStr = item.end ? new Date(item.end).toLocaleDateString('pt-BR') : '';
            if (item.ongoing) endStr = 'Até hoje';
            
            let titleTxt = `${item.content}`;
            if (startStr && endStr) {
                titleTxt += `\nPeríodo: ${startStr} - ${endStr}`;
            } else if (startStr) {
                titleTxt += `\nData: ${startStr}`;
            }
            
            if (item.title !== titleTxt) {
                updateObj.title = titleTxt;
                hasChanges = true;
            }

            if (item.ongoing) {
                const today = new Date();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const newEnd = `${today.getFullYear()}-${mm}-${dd}`;
                // Avoid infinite loops by checking string format matching (data.js has string, after load it might be different, but DataSet normalizes)
                if (new Date(item.end).getTime() !== new Date(newEnd).getTime()) {
                    updateObj.end = newEnd;
                    updateObj.type = 'range';
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                updates.push(updateObj);
            }
        });
        
        if (updates.length > 0) {
            items.update(updates);
        } else {
            saveToLocalStorage();
        }
    }

    function saveToLocalStorage() {
        const data = { groups: groups.get(), items: items.get() };
        localStorage.setItem('timelineData', JSON.stringify(data));
    }

    preprocessAndSave();

    // Auto-save no localstorage em caso de edição, deleção etc.
    items.on('*', saveToLocalStorage);
    groups.on('*', saveToLocalStorage);

    const options = {
        tooltip: {
            followMouse: true
        },
        groupOrder: 'order',
        orientation: 'top',
        start: '1975-01-01',
        end: '2030-01-01',
        height: '100%',
        editable: {
            add: true,
            updateTime: true,
            updateGroup: true,
            remove: true,
            overrideItems: false
        },
        zoomMin: 1000 * 60 * 60 * 24 * 30, // 1 mês
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 100, // 100 anos
        stack: true, // Permitir empilhamento de eventos (overlapping resolve aqui)
        verticalScroll: true,
        horizontalScroll: true,
        zoomKey: 'ctrlKey',
        groupTemplate: function(group) {
            if (!group) return;
            
            let shortContent = group.content;
            if (group.treeLevel === 1) {
                const words = group.content.split(' ').filter(w => w.trim() !== '');
                if (words.length === 1) shortContent = words[0].substring(0,3);
                else shortContent = words[0][0].toUpperCase() + words[words.length-1][0].toUpperCase();
            } else {
                if (group.content === 'Vida') shortContent = 'Vid';
                else if (group.content === 'Estado') shortContent = 'Est';
                else if (group.content === 'Saúde') shortContent = 'Saú';
                else if (group.content === 'Eventos') shortContent = 'Eve';
                else if (group.content === 'Patrimônio') shortContent = 'Pat';
                else if (group.content === 'Diversos') shortContent = 'Div';
                else shortContent = group.content.substring(0,3);
            }

            const el = document.createElement('div');
            el.innerHTML = `
                <span class="desktop-text" style="font-weight: ${group.treeLevel === 1 ? '600' : '400'};">${group.content}</span>
                <span class="mobile-text" style="font-weight: ${group.treeLevel === 1 ? '600' : '400'};" title="${group.content}">${shortContent}</span>
            `;
            return el;
        },
        template: function (item, element, data) {
            let html = item.content;
            if (window.showDuration && item.start && item.end) {
                const s = new Date(item.start);
                const e = new Date(item.end);
                
                let years = e.getFullYear() - s.getFullYear();
                let months = e.getMonth() - s.getMonth();
                let days = e.getDate() - s.getDate();
                
                if (days < 0) {
                    months--;
                    const prevMonth = new Date(e.getFullYear(), e.getMonth(), 0);
                    days += prevMonth.getDate();
                }
                if (months < 0) {
                    years--;
                    months += 12;
                }
                
                let durStr = [];
                if (years > 0) durStr.push(years + 'a');
                if (months > 0) durStr.push(months + 'm');
                if (days > 0) durStr.push(days + 'd');
                
                if (durStr.length > 0) {
                    const statusText = item.ongoing ? 'Em andamento: ' : '';
                    html += ` <span style="opacity: 0.7; font-size: 0.85em; margin-left: 4px; font-weight: normal;">(${statusText}${durStr.join(' ')})</span>`;
                }
            }
            return html;
        },
        // Callbacks para o Modal
        onAdd: function (item, callback) {
            openModal(item, callback, 'Criar Novo Evento');
        },
        onUpdate: function (item, callback) {
            openModal(item, callback, 'Editar Evento');
        }
    };

    // 3.5 Categorias Dinâmicas (DataView)
    const activeCategories = new Set(['Vida', 'Estado', 'Saúde', 'Eventos', 'Patrimônio', 'Diversos']);
    const groupsView = new vis.DataView(groups, {
        filter: function (group) {
            if (group.treeLevel === 1) return true; // Sempre mostra a Pessoa Raiz
            return activeCategories.has(group.content);
        }
    });

    // groupsView e items
    const timeline = new vis.Timeline(container, items, groupsView, options);

    // Zoom ao dar duplo-clique no eixo do tempo (coluna do ano/mês)
    timeline.on('doubleClick', function (properties) {
        if (properties.what === 'axis') {
            const clickedDate = properties.time;
            const windowObj = timeline.getWindow();
            const rangeInMs = windowObj.end - windowObj.start;
            const oneYearMs = 1000 * 60 * 60 * 24 * 365;
            
            // Se a visualização for de mais de 3 anos, foca no ano clicado.
            // Se já estiver perto (menos de 3 anos), foca no mês clicado.
            if (rangeInMs > oneYearMs * 3) {
                const year = clickedDate.getFullYear();
                timeline.setWindow(`${year}-01-01`, `${year}-12-31`, { animation: true });
            } else {
                const year = clickedDate.getFullYear();
                const month = clickedDate.getMonth() + 1; 
                const lastDay = new Date(year, month, 0).getDate();
                const mm = month.toString().padStart(2, '0');
                timeline.setWindow(`${year}-${mm}-01`, `${year}-${mm}-${lastDay}`, { animation: true });
            }
        }
    });

    // 4. Zoom Toolbar Controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        timeline.zoomIn(0.4);
    });
    
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        timeline.zoomOut(0.4);
    });
    
    document.getElementById('btn-fit').addEventListener('click', () => {
        timeline.fit(); // Ajusta para exibir todos os itens do dataset
    });

    document.getElementById('btn-filter-year').addEventListener('click', () => {
        const startYear = document.getElementById('filter-start').value;
        const endYear = document.getElementById('filter-end').value;
        
        if (startYear && endYear) {
            // Ajusta a janela da timeline para o período dos anos informados
            timeline.setWindow(`${startYear}-01-01`, `${endYear}-12-31`);
        } else {
            alert('Por favor, preencha os dois anos (Início e Fim).');
        }
    });

    window.showDuration = false;
    document.getElementById('toggle-duration').addEventListener('change', (e) => {
        window.showDuration = e.target.checked;
        timeline.redraw();
    });

    // 5. Category Checkboxes Logic
    document.querySelectorAll('.cat-toggle input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const val = e.target.value;
            if (e.target.checked) {
                activeCategories.add(val);
            } else {
                activeCategories.delete(val);
            }
            groupsView.refresh();
        });
    });

    // 6. Exportações
    document.getElementById('btn-export-image').addEventListener('click', () => {
        // Usa html2canvas para capturar a timeline
        const container = document.getElementById('timeline-container');
        html2canvas(container).then(canvas => {
            const link = document.createElement('a');
            link.download = 'timeline-export.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });

    document.getElementById('btn-export-text').addEventListener('click', () => {
        let textData = "Life Timeline - Exportação\n\n";
        
        // Filtrar apenas Pessoas
        const people = groups.get({ filter: g => g.treeLevel === 1 });
        
        people.forEach(person => {
            textData += `${person.content}\n`;
            const personCategories = person.nestedGroups || [];
            
            personCategories.forEach(catId => {
                const catGroup = groups.get(catId);
                // Respeitar o filtro de categorias ativas
                if (catGroup && activeCategories.has(catGroup.content)) {
                    const groupItems = items.get({ filter: i => i.group === catId });
                    if (groupItems.length > 0) {
                        textData += `\t${catGroup.content}\n`;
                        
                        groupItems.sort((a,b) => new Date(a.start) - new Date(b.start));
                        groupItems.forEach(item => {
                            const s = new Date(item.start).toLocaleDateString('pt-BR');
                            const e = item.end ? new Date(item.end).toLocaleDateString('pt-BR') : '';
                            const dateInfo = e ? (item.ongoing ? `${s} até Hoje` : `${s} até ${e}`) : s;
                            
                            textData += `\t\t- ${item.content} (${dateInfo})\n`;
                        });
                    }
                }
            });
            textData += "\n";
        });

        const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "timeline-hierarquia.txt";
        link.click();
    });

    document.getElementById('btn-export-opml').addEventListener('click', () => {
        let opmlData = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        opmlData += `<opml version="2.0">\n`;
        opmlData += `  <head>\n`;
        opmlData += `    <title>Life Timeline Export</title>\n`;
        opmlData += `  </head>\n`;
        opmlData += `  <body>\n`;
        
        // Escape XML entities
        const escapeXml = (unsafe) => {
            return unsafe.replace(/[<>&'"]/g, function (c) {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                }
            });
        };

        const people = groups.get({ filter: g => g.treeLevel === 1 });
        
        people.forEach(person => {
            opmlData += `    <outline text="${escapeXml(person.content)}">\n`;
            
            const personCategories = person.nestedGroups || [];
            
            personCategories.forEach(catId => {
                const catGroup = groups.get(catId);
                // Respeitar o filtro
                if (catGroup && activeCategories.has(catGroup.content)) {
                    const groupItems = items.get({ filter: i => i.group === catId });
                    
                    if (groupItems.length > 0) {
                        opmlData += `      <outline text="${escapeXml(catGroup.content)}">\n`;
                        
                        groupItems.sort((a,b) => new Date(a.start) - new Date(b.start));
                        groupItems.forEach(item => {
                            const s = new Date(item.start).toLocaleDateString('pt-BR');
                            const e = item.end ? new Date(item.end).toLocaleDateString('pt-BR') : '';
                            const dateInfo = e ? (item.ongoing ? `${s} até Hoje` : `${s} até ${e}`) : s;
                            
                            const text = `${item.content} (${dateInfo})`;
                            opmlData += `        <outline text="${escapeXml(text)}" />\n`;
                        });
                        
                        opmlData += `      </outline>\n`;
                    }
                }
            });
            
            opmlData += `    </outline>\n`;
        });
        
        opmlData += `  </body>\n`;
        opmlData += `</opml>`;

        const blob = new Blob([opmlData], { type: 'text/xml;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "timeline.opml";
        link.click();
    });

    // 7. Backup JSON (Save / Load)
    document.getElementById('btn-export-json').addEventListener('click', () => {
        const data = { groups: groups.get(), items: items.get() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'timeline-backup.json';
        link.click();
    });

    document.getElementById('btn-import-json').addEventListener('click', () => {
        document.getElementById('file-import-json').click();
    });

    document.getElementById('file-import-json').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (parsed.groups && parsed.items) {
                    groups.off('*', saveToLocalStorage);
                    items.off('*', saveToLocalStorage);
                    
                    groups.clear();
                    items.clear();
                    groups.add(parsed.groups);
                    items.add(parsed.items);
                    
                    groups.on('*', saveToLocalStorage);
                    items.on('*', saveToLocalStorage);
                    
                    preprocessAndSave();
                    timeline.fit();
                    alert('Backup carregado com sucesso!');
                } else {
                    alert('Arquivo JSON inválido (Faltando groups ou items).');
                }
            } catch(err) {
                alert('Erro ao carregar o arquivo JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // 8. Gerenciamento de Pessoas
    const peopleModal = document.getElementById('people-modal');
    
    document.getElementById('btn-manage-people').addEventListener('click', () => {
        renderPeopleList();
        peopleModal.classList.remove('hidden');
    });

    document.getElementById('people-modal-close').addEventListener('click', () => {
        peopleModal.classList.add('hidden');
    });

    function renderPeopleList() {
        const listEl = document.getElementById('people-list');
        listEl.innerHTML = '';
        
        const people = groups.get({ filter: g => g.treeLevel === 1 });
        people.sort((a,b) => (a.order || 0) - (b.order || 0));
        
        people.forEach(p => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '8px 12px';
            li.style.borderBottom = '1px solid var(--border-color)';
            
            const nameSpan = document.createElement('span');
            nameSpan.innerText = p.content;
            
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '4px';

            const btnEdit = document.createElement('button');
            btnEdit.innerText = '✏️ Editar';
            btnEdit.className = 'btn btn-secondary btn-small';
            btnEdit.onclick = () => {
                const newName = prompt('Digite o novo nome para ' + p.content + ':', p.content);
                if (newName && newName.trim() !== '') {
                    groups.update({ id: p.id, content: newName.trim() });
                    renderPeopleList();
                }
            };
            
            const btnDelete = document.createElement('button');
            btnDelete.innerText = '🗑️ Excluir';
            btnDelete.className = 'btn btn-secondary btn-small';
            btnDelete.style.color = '#ff4d4f';
            btnDelete.style.borderColor = 'rgba(255, 77, 79, 0.5)';
            btnDelete.onclick = () => {
                const ok = confirm(`Tem certeza que deseja excluir '${p.content}' e TODOS os seus eventos? Esta ação não pode ser desfeita.`);
                if (ok) {
                    // Remover root group
                    groups.remove(p.id);
                    
                    // Remover categorias e eventos relacionados
                    if (p.nestedGroups) {
                        p.nestedGroups.forEach(catId => {
                            const itemsToRemove = items.get({ filter: i => i.group === catId });
                            items.remove(itemsToRemove.map(i => i.id));
                            groups.remove(catId);
                        });
                    }
                    
                    // Verificar se ficou sem ninguém
                    const remaining = groups.get({ filter: g => g.treeLevel === 1 });
                    if (remaining.length === 0) {
                        alert('A timeline não pode ficar vazia. Um perfil padrão foi criado.');
                        document.getElementById('new-person-name').value = 'Minha Vida';
                        document.getElementById('btn-add-person').click();
                    } else {
                        renderPeopleList();
                    }
                }
            };
            
            btnGroup.appendChild(btnEdit);
            btnGroup.appendChild(btnDelete);

            li.appendChild(nameSpan);
            li.appendChild(btnGroup);
            listEl.appendChild(li);
        });
    }

    document.getElementById('btn-add-person').addEventListener('click', () => {
        const input = document.getElementById('new-person-name');
        const name = input.value.trim();
        if (!name) return;
        
        const ts = Date.now();
        const personId = `p_${ts}`;
        
        const people = groups.get({ filter: g => g.treeLevel === 1 });
        let maxOrder = 0;
        people.forEach(p => { if (p.order > maxOrder) maxOrder = p.order; });
        const personOrder = maxOrder + 10;
        
        const catVidaId = `c_vida_${ts}`;
        const catEstadoId = `c_estado_${ts}`;
        const catSaudeId = `c_saude_${ts}`;
        const catEventosId = `c_eventos_${ts}`;
        const catPatriId = `c_patrimonio_${ts}`;
        const catDivId = `c_diversos_${ts}`;

        const newGroups = [
            { id: personId, content: name, treeLevel: 1, nestedGroups: [catVidaId, catEstadoId, catSaudeId, catEventosId, catPatriId, catDivId], showNested: true, order: personOrder },
            { id: catVidaId, content: 'Vida', treeLevel: 2, order: personOrder + 1 },
            { id: catEstadoId, content: 'Estado', treeLevel: 2, order: personOrder + 2 },
            { id: catSaudeId, content: 'Saúde', treeLevel: 2, order: personOrder + 3 },
            { id: catEventosId, content: 'Eventos', treeLevel: 2, order: personOrder + 4 },
            { id: catPatriId, content: 'Patrimônio', treeLevel: 2, order: personOrder + 5 },
            { id: catDivId, content: 'Diversos', treeLevel: 2, order: personOrder + 6 }
        ];
        
        groups.add(newGroups);
        input.value = '';
        renderPeopleList();
    });

    // 9. Ocultar/Mostrar Menus (Espaço de Tela)
    const btnToggleMenu = document.getElementById('fab-menu-toggle');
    const topMenus = document.getElementById('top-menus');
    
    // Auto-ocultar no mobile por padrão para dar espaço total à timeline
    if (window.innerWidth <= 768) {
        topMenus.classList.add('hidden');
        btnToggleMenu.innerText = '⚙️ Mostrar Menus';
    }

    btnToggleMenu.addEventListener('click', () => {
        if (topMenus.classList.contains('hidden')) {
            topMenus.classList.remove('hidden');
            btnToggleMenu.innerText = '👁️ Esconder Menus';
        } else {
            topMenus.classList.add('hidden');
            btnToggleMenu.innerText = '⚙️ Mostrar Menus';
        }
        // Redraw no timeline para ele ocupar o novo espaço vertical
        setTimeout(() => timeline.redraw(), 50);
    });

    // Fix render inicial
    setTimeout(() => {
        timeline.redraw();
    }, 100);
});
