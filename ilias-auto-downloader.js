// ==UserScript==
// @name           ILIAS Auto-Downloader
// @namespace      https://ddoo.me/ilias-auto-downloader
// @version        1.1
// @description    Automated Tampermonkey script for ILIAS. Automatically and locally downloads published files from individual or all ILIAS courses as a ZIP archive – including a local history to download only new or updated files.
// @description:de Automatisiertes Tampermonkey-Skript für ILIAS. Lädt veröffentlichte Dateien aus einzelnen oder allen ILIAS-Kursen automatisch und lokal als ZIP-Archiv herunter – inklusive lokalem Verlauf für nur neue oder geänderte Dateien.
// @author         ewebfly
// @homepageURL    https://ddoo.me/ilias-auto-downloader
// @supportURL     https://github.com/ewebfly/Ilias-auto-downloader/issues
// @match          *://*.ilias.*/*
// @match          *://ilias.*/*
// @match          *://*/ilias.php*
// @icon           https://www.google.com/s2/favicons?sz=64&domain=ilias.de
// @require        https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @updateURL      https://raw.githubusercontent.com/ewebfly/Ilias-auto-downloader/main/ilias-auto-downloader.js
// @downloadURL    https://raw.githubusercontent.com/ewebfly/Ilias-auto-downloader/main/ilias-auto-downloader.js
// @grant          none
// @run-at         document-idle
// ==/UserScript==

/* global JSZip */

(function() {
    'use strict';

    function initialize() {
        
        // --- SPRACH-ERKENNUNG (I18N) ---
        const isDe = navigator.language.startsWith('de');
        const txt = {
            btnMain: isDe ? 'ILIAS Download (neue Dateien)' : 'ILIAS Download (get new files)',
            btnFull: isDe ? 'Full Download (alle Dateien laden)' : 'Full Download (get all files)',
            btnManage: isDe ? 'Speicher verwalten (JSON editieren)' : 'Manage Storage (Edit JSON)',
            btnReset: isDe ? 'Reset (Sync-Daten löschen)' : 'Reset (delete Sync-Information)',
            errNoCourses: isDe ? 'Keine Kurse gefunden. Bitte auf das Dashboard oder in einen Kurs gehen.' : 'No courses found. Please navigate to the dashboard or a course page.',
            analyzing: (num) => isDe ? `⏳ Analysiere (${num} Kurse)...` : `⏳ Analyzing (${num} courses)...`,
            loading: (curr, total, title) => isDe ? `⏳ Lade ${curr}/${total}: ${title}` : `⏳ Loading ${curr}/${total}: ${title}`,
            upToDate: isDe ? 'Alles auf dem neuesten Stand! Keine neuen Inhalte gefunden.' : 'Everything is up to date! No new content found.',
            zipping: isDe ? '📦 Erstelle ZIP-Archiv...' : '📦 Creating ZIP archive...',
            zipError: isDe ? 'Fehler bei der Erstellung des ZIP-Archivs.' : 'Error creating the ZIP archive.',
            confirmReset: isDe ? 'Möchtest du den Download-Speicher für alle Kurse wirklich löschen?\n\nBeim nächsten Download werden dann wieder alle Dateien komplett neu heruntergeladen.' : 'Do you really want to clear the download cache for all courses?\n\nThe next download will fetch all files completely from scratch.',
            resetSuccess: isDe ? 'Cache wurde erfolgreich gelöscht.' : 'Cache successfully cleared.',
            modTitle: isDe ? 'Lokaler Speicher (LocalStorage)' : 'Local Storage Manager',
            btnSave: isDe ? 'Speichern' : 'Save',
            btnSaved: isDe ? '✔ Gespeichert' : '✔ Saved',
            btnDel: isDe ? 'Löschen' : 'Delete',
            invalidJson: isDe ? 'Ungültiges JSON Format!\n\nBitte überprüfe deine Eingabe auf fehlende Klammern oder Kommas.' : 'Invalid JSON format!\n\nPlease check your input for missing brackets or commas.',
            confirmDelItem: isDe ? 'Möchtest du den Speicher für diesen Kurs wirklich löschen?' : 'Do you really want to delete the storage for this course?',
            modEmpty: isDe ? 'Keine lokalen Speicherdaten gefunden.\nFühre zuerst einen Download aus.' : 'No local storage data found.\nPlease perform a download first.'
        };

        // --- SVG ICONS ---
        const iconSync = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: text-bottom;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        const iconFull = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: text-bottom;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><polyline points="8 12 12 16 16 12"></polyline></svg>`;
        const iconTrash = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: text-bottom;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        const iconDb = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: text-bottom;"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`;
        const iconChevronUp = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
        const iconChevronDown = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        // --- UI ERSTELLEN ---
        let wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.bottom = '20px';
        wrapper.style.right = '20px';
        wrapper.style.zIndex = '999999';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'stretch';
        wrapper.style.fontFamily = 'Segoe UI, Arial, sans-serif';
        wrapper.style.width = '310px'; 

        // Menü
        let menu = document.createElement('div');
        menu.style.display = 'none';
        menu.style.flexDirection = 'column';
        menu.style.backgroundColor = '#ffffff';
        menu.style.border = '1px solid #e2e8f0';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
        menu.style.marginBottom = '8px';
        menu.style.overflow = 'hidden';

        let btnFull = createMenuButton(iconFull + txt.btnFull, '#334155');
        //let btnManage = createMenuButton(iconDb + txt.btnManage, '#0284c7'); // Dev Tool
        let btnClear = createMenuButton(iconTrash + txt.btnReset, '#ef4444');
        btnClear.style.borderTop = '1px solid #f1f5f9';

        menu.appendChild(btnFull);
        //menu.appendChild(btnManage); // Dev Tool
        menu.appendChild(btnClear);
        wrapper.appendChild(menu);

        // Button-Gruppe (Hauptbutton + Pfeil)
        let btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
        btnGroup.style.borderRadius = '8px';
        btnGroup.style.overflow = 'hidden';
        btnGroup.style.backgroundColor = '#005a9c';

        let mainBtnText = iconSync + txt.btnMain;
        let mainBtn = document.createElement('button');
        mainBtn.innerHTML = mainBtnText;
        mainBtn.style.flexGrow = '1';
        mainBtn.style.padding = '12px 16px';
        mainBtn.style.backgroundColor = 'transparent';
        mainBtn.style.color = '#ffffff';
        mainBtn.style.border = 'none';
        mainBtn.style.cursor = 'pointer';
        mainBtn.style.fontSize = '14px';
        mainBtn.style.fontWeight = '600';
        mainBtn.style.outline = 'none';
        mainBtn.style.textAlign = 'center';
        mainBtn.style.transition = 'background-color 0.2s';
        mainBtn.onmouseover = () => { mainBtn.style.backgroundColor = 'rgba(255,255,255,0.1)'; };
        mainBtn.onmouseout = () => { mainBtn.style.backgroundColor = 'transparent'; };

        let chevronBtn = document.createElement('button');
        chevronBtn.innerHTML = iconChevronUp;
        chevronBtn.style.padding = '0 12px';
        chevronBtn.style.backgroundColor = 'transparent';
        chevronBtn.style.color = '#ffffff';
        chevronBtn.style.border = 'none';
        chevronBtn.style.borderLeft = '1px solid rgba(255,255,255,0.2)';
        chevronBtn.style.cursor = 'pointer';
        chevronBtn.style.outline = 'none';
        chevronBtn.style.display = 'flex';
        chevronBtn.style.alignItems = 'center';
        chevronBtn.style.transition = 'background-color 0.2s';
        chevronBtn.onmouseover = () => { chevronBtn.style.backgroundColor = 'rgba(255,255,255,0.1)'; };
        chevronBtn.onmouseout = () => { chevronBtn.style.backgroundColor = 'transparent'; };

        btnGroup.appendChild(mainBtn);
        btnGroup.appendChild(chevronBtn);
        wrapper.appendChild(btnGroup);
        document.body.appendChild(wrapper);

        // Menü-Button Styling
        function createMenuButton(text, textColor) {
            let b = document.createElement('button');
            b.innerHTML = text;
            b.style.padding = '12px 16px';
            b.style.backgroundColor = '#ffffff';
            b.style.color = textColor;
            b.style.border = 'none';
            b.style.cursor = 'pointer';
            b.style.fontWeight = '600';
            b.style.textAlign = 'left';
            b.style.fontSize = '13px';
            b.style.transition = 'background-color 0.2s';
            b.onmouseover = () => { b.style.backgroundColor = '#f8fafc'; };
            b.onmouseout = () => { b.style.backgroundColor = '#ffffff'; };
            return b;
        }

        // --- MENÜ STEUERUNG ---
        function toggleMenu(show) {
            let isCurrentlyHidden = menu.style.display === 'none';
            let shouldShow = show !== undefined ? show : isCurrentlyHidden;

            if (shouldShow) {
                menu.style.display = 'flex';
                chevronBtn.innerHTML = iconChevronDown;
            } else {
                menu.style.display = 'none';
                chevronBtn.innerHTML = iconChevronUp;
            }
        }

        chevronBtn.onclick = (e) => {
            e.stopPropagation();
            toggleMenu();
        };

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && menu.style.display === 'flex') {
                toggleMenu(false);
            }
        });

        // --- MODAL: STORAGE MANAGER ---
        function openStorageModal() {
            let overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0'; 
            overlay.style.left = '0'; 
            overlay.style.width = '100%'; 
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
            overlay.style.zIndex = '1000000';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.fontFamily = 'Segoe UI, Arial, sans-serif';

            let modal = document.createElement('div');
            modal.style.backgroundColor = '#ffffff';
            modal.style.width = '600px';
            modal.style.maxWidth = '90%';
            modal.style.maxHeight = '85vh';
            modal.style.borderRadius = '12px';
            modal.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';

            let header = document.createElement('div');
            header.style.padding = '20px 24px';
            header.style.borderBottom = '1px solid #e2e8f0';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            
            let title = document.createElement('h3');
            title.innerText = txt.modTitle;
            title.style.margin = '0';
            title.style.fontSize = '18px';
            title.style.color = '#0f172a';
            
            let closeBtn = document.createElement('button');
            closeBtn.innerText = '✕';
            closeBtn.style.border = 'none';
            closeBtn.style.background = 'none';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontSize = '20px';
            closeBtn.style.color = '#64748b';
            closeBtn.onmouseover = () => { closeBtn.style.color = '#0f172a'; };
            closeBtn.onmouseout = () => { closeBtn.style.color = '#64748b'; };
            closeBtn.onclick = () => document.body.removeChild(overlay);

            header.appendChild(title);
            header.appendChild(closeBtn);
            modal.appendChild(header);

            let content = document.createElement('div');
            content.style.padding = '24px';
            content.style.overflowY = 'auto';
            content.style.flexGrow = '1';
            content.style.backgroundColor = '#f8fafc';

            let hasItems = false;
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                if (key && key.startsWith('ilias_crs_sync_')) {
                    hasItems = true;
                    let val = localStorage.getItem(key);
                    let parsed = "{}";
                    try { parsed = JSON.stringify(JSON.parse(val), null, 4); } catch(e) { parsed = val; }

                    let itemDiv = document.createElement('div');
                    itemDiv.style.marginBottom = '24px';
                    itemDiv.style.border = '1px solid #e2e8f0';
                    itemDiv.style.borderRadius = '8px';
                    itemDiv.style.padding = '16px';
                    itemDiv.style.backgroundColor = '#ffffff';

                    let itemTitle = document.createElement('div');
                    itemTitle.innerText = key;
                    itemTitle.style.fontWeight = 'bold';
                    itemTitle.style.marginBottom = '12px';
                    itemTitle.style.fontSize = '14px';
                    itemTitle.style.color = '#334155';
                    itemTitle.style.wordBreak = 'break-all';

                    let textarea = document.createElement('textarea');
                    textarea.value = parsed;
                    textarea.style.width = '100%';
                    textarea.style.height = '180px';
                    textarea.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
                    textarea.style.fontSize = '12px';
                    textarea.style.padding = '12px';
                    textarea.style.border = '1px solid #cbd5e1';
                    textarea.style.borderRadius = '6px';
                    textarea.style.boxSizing = 'border-box';
                    textarea.style.marginBottom = '12px';
                    textarea.style.resize = 'vertical';
                    textarea.style.backgroundColor = '#f1f5f9';
                    textarea.style.color = '#0f172a';
                    textarea.style.outline = 'none';
                    textarea.onfocus = () => { textarea.style.borderColor = '#0ea5e9'; };
                    textarea.onblur = () => { textarea.style.borderColor = '#cbd5e1'; };

                    let btnRow = document.createElement('div');
                    btnRow.style.display = 'flex';
                    btnRow.style.gap = '12px';
                    btnRow.style.justifyContent = 'flex-end';

                    let saveBtn = document.createElement('button');
                    saveBtn.innerText = txt.btnSave;
                    saveBtn.style.padding = '8px 16px';
                    saveBtn.style.backgroundColor = '#0ea5e9';
                    saveBtn.style.color = '#ffffff';
                    saveBtn.style.border = 'none';
                    saveBtn.style.borderRadius = '6px';
                    saveBtn.style.cursor = 'pointer';
                    saveBtn.style.fontSize = '13px';
                    saveBtn.style.fontWeight = '600';
                    saveBtn.style.transition = 'background-color 0.2s';
                    saveBtn.onclick = () => {
                        try {
                            let toSave = JSON.stringify(JSON.parse(textarea.value));
                            localStorage.setItem(key, toSave);
                            
                            saveBtn.innerText = txt.btnSaved;
                            saveBtn.style.backgroundColor = '#22c55e';
                            setTimeout(() => { 
                                saveBtn.innerText = txt.btnSave; 
                                saveBtn.style.backgroundColor = '#0ea5e9'; 
                            }, 2000);
                        } catch(e) {
                            alert(txt.invalidJson);
                        }
                    };

                    let delBtn = document.createElement('button');
                    delBtn.innerText = txt.btnDel;
                    delBtn.style.padding = '8px 16px';
                    delBtn.style.backgroundColor = '#ef4444';
                    delBtn.style.color = '#ffffff';
                    delBtn.style.border = 'none';
                    delBtn.style.borderRadius = '6px';
                    delBtn.style.cursor = 'pointer';
                    delBtn.style.fontSize = '13px';
                    delBtn.style.fontWeight = '600';
                    delBtn.onclick = () => {
                        if(confirm(txt.confirmDelItem)) {
                            localStorage.removeItem(key);
                            content.removeChild(itemDiv);
                        }
                    };

                    btnRow.appendChild(saveBtn);
                    btnRow.appendChild(delBtn);
                    itemDiv.appendChild(itemTitle);
                    itemDiv.appendChild(textarea);
                    itemDiv.appendChild(btnRow);
                    content.appendChild(itemDiv);
                }
            }

            if(!hasItems) {
                let emptyMsg = document.createElement('p');
                emptyMsg.innerText = txt.modEmpty;
                emptyMsg.style.color = '#64748b';
                emptyMsg.style.textAlign = 'center';
                emptyMsg.style.marginTop = '40px';
                emptyMsg.style.whiteSpace = 'pre-line';
                content.appendChild(emptyMsg);
            }

            modal.appendChild(content);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }

        // --- CORE HILFSFUNKTIONEN ---
        function sanitize(name) { return name.replace(/[/\\?%*:|"<>]/g, '_').trim(); }

        function normalizeDateMetadata(text, language) {
            let today = new Date();
            let yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            function formatDateTime(year, month, day, hour, minute, meridiem) {
                let hourNumber = Number(hour);
                if (meridiem) {
                    hourNumber = hourNumber % 12 + (/^p/i.test(meridiem) ? 12 : 0);
                }
                let date = new Date(Number(year), Number(month) - 1, Number(day));
                if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hourNumber).padStart(2, '0')}:${minute}`;
            }

            function formatRelativeDate(date, hour, minute, meridiem) {
                return formatDateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), hour, minute, meridiem);
            }

            function normalizeWord(value) {
                return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.$/, '');
            }

            let relativeDateTerms = {
                heute: today,
                gestern: yesterday,
                today: today,
                yesterday: yesterday,
                hoy: today,
                ayer: yesterday,
                "aujourd'hui": today,
                "aujourd’hui": today,
                hier: yesterday,
                ma: today,
                tegnap: yesterday,
                oggi: today,
                ieri: yesterday,
                dzisiaj: today,
                dzis: today,
                'dziś': today,
                'wczoraj': yesterday
            };
            let relativeAlternation = Object.keys(relativeDateTerms)
                .sort((a, b) => b.length - a.length)
                .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|');
            let relativePattern = new RegExp(`(^|[^\\p{L}])(${relativeAlternation})(?=[,\\s])[,]?\\s*(\\d{1,2}):(\\d{2})(?:\\s*(AM|PM))?`, 'giu');

            text = text.replace(relativePattern, (match, prefix, term, hour, minute, meridiem) => {
                let date = relativeDateTerms[normalizeWord(term)];
                return `${prefix}${formatRelativeDate(date, hour, minute, meridiem) || match.slice(prefix.length)}`;
            });

            let monthAliases = {
                1: ['january', 'jan', 'januar', 'janu', 'enero', 'ene', 'janvier', 'janv', 'januar', 'január', 'januar', 'gennaio', 'gen', 'styczen', 'stycznia', 'sty'],
                2: ['february', 'feb', 'februar', 'febr', 'febrero', 'février', 'fevrier', 'févr', 'fevr', 'február', 'februar', 'febbraio', 'luty', 'lutego', 'lut'],
                3: ['march', 'mar', 'märz', 'maerz', 'marz', 'marzo', 'mars', 'március', 'marcius', 'marzec', 'marca'],
                4: ['april', 'apr', 'abril', 'avril', 'avr', 'április', 'aprilis', 'aprile', 'kwiecien', 'kwietnia', 'kwi'],
                5: ['may', 'mai', 'mayo', 'maio', 'május', 'majus', 'maggio', 'maj', 'maja'],
                6: ['june', 'jun', 'juni', 'junio', 'juin', 'június', 'junius', 'giugno', 'giu', 'czerwiec', 'czerwca', 'cze'],
                7: ['july', 'jul', 'juli', 'julio', 'juillet', 'juil', 'július', 'julius', 'luglio', 'lug', 'lipiec', 'lipca', 'lip'],
                8: ['august', 'aug', 'agosto', 'ago', 'août', 'aout', 'augusztus', 'sierpien', 'sierpnia', 'sie'],
                9: ['september', 'sep', 'sept', 'septiembre', 'setiembre', 'set', 'septembre', 'szeptember', 'settembre', 'wrzesien', 'września', 'wrz'],
                10: ['october', 'oct', 'oktober', 'okt', 'octubre', 'octobre', 'október', 'ottobre', 'ott', 'pazdziernik', 'października', 'paz', 'paź'],
                11: ['november', 'nov', 'noviembre', 'novembre', 'november', 'novembre', 'listopad', 'listopada', 'lis'],
                12: ['december', 'dec', 'dezember', 'dez', 'diciembre', 'décembre', 'decembre', 'déc', 'dicembre', 'dic', 'grudzien', 'grudnia', 'gru']
            };
            let monthNumbers = new Map();
            Object.entries(monthAliases).forEach(([month, aliases]) => {
                aliases.forEach(alias => monthNumbers.set(normalizeWord(alias), Number(month)));
            });

            function replaceNamedDate(pattern, getParts) {
                text = text.replace(pattern, (match, ...groups) => {
                    let parts = getParts(groups);
                    let month = monthNumbers.get(normalizeWord(parts.month));
                    let normalized = month && formatDateTime(parts.year, month, parts.day, parts.hour, parts.minute, parts.meridiem);
                    return normalized || match;
                });
            }

            let time = '(\\d{1,2}):(\\d{2})(?:\\s*(AM|PM))?';
            replaceNamedDate(new RegExp(`(\\d{1,2})\\.?\\s+([\\p{L}.]+)\\s+(\\d{4})[,]?\\s+${time}`, 'giu'), groups => ({ day: groups[0], month: groups[1], year: groups[2], hour: groups[3], minute: groups[4], meridiem: groups[5] }));
            replaceNamedDate(new RegExp(`([\\p{L}.]+)\\s+(\\d{1,2}),?\\s+(\\d{4})[,]?\\s+${time}`, 'giu'), groups => ({ month: groups[0], day: groups[1], year: groups[2], hour: groups[3], minute: groups[4], meridiem: groups[5] }));
            replaceNamedDate(new RegExp(`(\\d{4})\\.?\\s+([\\p{L}.]+)\\s+(\\d{1,2})\\.?[,]?\\s+${time}`, 'giu'), groups => ({ year: groups[0], month: groups[1], day: groups[2], hour: groups[3], minute: groups[4], meridiem: groups[5] }));

            let numericYearFirstPattern = /(\d{4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})\.?[,]?\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/g;
            text = text.replace(numericYearFirstPattern, (match, year, month, day, hour, minute, meridiem) => {
                return formatDateTime(year, month, day, hour, minute, meridiem) || match;
            });

            let numericDatePattern = language && /^en(?:-|$)/i.test(language)
                ? /(\d{1,2})\/(\d{1,2})\/(\d{4})[,]?\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/g
                : /(\d{1,2})[./-](\d{1,2})[./-](\d{4})[,]?\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/g;
            text = text.replace(numericDatePattern, (match, first, second, year, hour, minute, meridiem) => {
                let month = language && /^en(?:-|$)/i.test(language) ? first : second;
                let day = language && /^en(?:-|$)/i.test(language) ? second : first;
                return formatDateTime(year, month, day, hour, minute, meridiem) || match;
            });

            return text;
        }

        function getStableKey(url) {
            let match = url.match(/(?:ref_id=|fold\/|crs\/)(\d+)/);
            return match ? match[1] : url;
        }

        function loadCourseState(courseId) {
            let saved = localStorage.getItem('ilias_crs_sync_' + courseId);
            return saved ? JSON.parse(saved) : {};
        }

        function saveCourseState(courseId, state) {
            localStorage.setItem('ilias_crs_sync_' + courseId, JSON.stringify(state));
        }

        function clearAllCaches() {
            let keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                if (key && key.startsWith('ilias_crs_sync_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            localStorage.removeItem('ilias_sync_state_v11');
        }

        function setUIState(isWorking, currentText) {
            mainBtn.disabled = isWorking;
            chevronBtn.disabled = isWorking;
            mainBtn.innerHTML = isWorking ? currentText : mainBtnText;
            btnGroup.style.opacity = isWorking ? '0.8' : '1';
            if (isWorking) toggleMenu(false);
        }

        function preventNavigation(e) {
            e.preventDefault();
            e.returnValue = '';
        }

        function toggleNavigationBlocker(enable) {
            if (enable) {
                window.addEventListener('beforeunload', preventNavigation);
            } else {
                window.removeEventListener('beforeunload', preventNavigation);
            }
        }

        // --- DOWNLOAD LOGIK ---
        async function scanFolder(folderUrl, currentPath, oldState, newState, zip, forceFull, visited = new Set()) {
            let folderId = getStableKey(folderUrl);
            if (visited.has(folderId)) return;
            visited.add(folderId);

            try {
                let response = await fetch(folderUrl);
                let text = await response.text();
                let doc = new DOMParser().parseFromString(text, 'text/html');

                let fileElements = doc.querySelectorAll('a[href*="cmd=sendfile"]');
                for (let a of fileElements) {
                    let fileUrl = a.href;
                    let fileId = getStableKey(fileUrl);
                    let fileName = a.textContent.trim() || "Document";
                    if (!fileName.toLowerCase().endsWith('.pdf')) fileName += ".pdf";
                    fileName = sanitize(fileName);

                    let row = a.closest('.ilCLI') || a.closest('.ilContainerListItemOuter');
                    let propsEl = row ? row.querySelector('.il_ItemProperties') : null;
                    let metaText = normalizeDateMetadata(propsEl ? propsEl.textContent.replace(/\s+/g, ' ').trim() : "FILE", doc.documentElement.lang);
                    let oldMetaText = oldState[fileId] ? normalizeDateMetadata(oldState[fileId], doc.documentElement.lang) : oldState[fileId];

                    let isNewOrChanged = forceFull || !oldMetaText || oldMetaText !== metaText;

                    if (isNewOrChanged) {
                        try {
                            let fileRes = await fetch(fileUrl);
                            if (!fileRes.ok) throw new Error("Status " + fileRes.status);
                            zip.file(`${currentPath}/${fileName}`, await fileRes.blob());
                            newState[fileId] = metaText; 
                        } catch (err) {
                            console.log(`[Error] file ${fileName}:`, err);
                            if (oldState[fileId]) newState[fileId] = oldState[fileId];
                        }
                    } else {
                        newState[fileId] = metaText;
                    }
                }

                let subFolders = [];
                doc.querySelectorAll('a[href*="goto.php/fold/"]').forEach(a => {
                    let fUrl = a.href;
                    if (fUrl) {
                        let subId = getStableKey(fUrl);
                        if (!visited.has(subId)) subFolders.push({ url: fUrl, id: subId, name: sanitize(a.textContent.trim() || "Folder") });
                    }
                });

                for (let sub of subFolders) {
                    let nextPath = `${currentPath}/${sub.name}`;
                    if (forceFull || !oldState[sub.id]) zip.folder(nextPath);
                    newState[sub.id] = "DIR";
                    await scanFolder(sub.url, nextPath, oldState, newState, zip, forceFull, visited);
                }
            } catch (e) {
                console.log("Folder Error:", folderUrl, e);
            }
        }

        async function startSync(forceFull) {
            toggleMenu(false);

            let courses = [];
            document.querySelectorAll('a.il-item-title a, a.il_ContainerItem_Title, a[href*="goto.php/crs/"]').forEach(a => {
                let href = a.href;
                let title = a.textContent.trim();
                if (href && href.includes('crs') && title && !courses.some(c => c.url === href)) {
                    courses.push({ url: href, id: getStableKey(href), title: sanitize(title) });
                }
            });

            if (courses.length === 0) {
                alert(txt.errNoCourses);
                return;
            }

            setUIState(true, txt.analyzing(courses.length));
            toggleNavigationBlocker(true);

            let zip = new JSZip();
            let stateUpdates = []; 

            for (let i = 0; i < courses.length; i++) {
                let course = courses[i];
                let currentPath = courses.length === 1 ? "" : course.title;
                
                // Setze UI Text dynamisch (z.B. "Lade 1/3: Mathe")
                mainBtn.innerHTML = txt.loading(i + 1, courses.length, course.title);

                let oldState = loadCourseState(course.id);
                let newState = {};
                let isInitialForCourse = Object.keys(oldState).length === 0;
                let effectiveForceFull = forceFull || isInitialForCourse;

                newState[course.id] = "DIR";
                if (courses.length > 1 && (effectiveForceFull || !oldState[course.id])) {
                    zip.folder(currentPath);
                }

                try {
                    let response = await fetch(course.url);
                    let doc = new DOMParser().parseFromString(await response.text(), 'text/html');

                    let directFiles = doc.querySelectorAll('a[href*="cmd=sendfile"]');
                    for (let a of directFiles) {
                        let fileUrl = a.href;
                        let fileId = getStableKey(fileUrl);
                        let fileName = sanitize(a.textContent.trim() || "Document");
                        if (!fileName.toLowerCase().endsWith('.pdf')) fileName += ".pdf";

                        let row = a.closest('.ilCLI') || a.closest('.ilContainerListItemOuter');
                        let propsEl = row ? row.querySelector('.il_ItemProperties') : null;
                        let metaText = normalizeDateMetadata(propsEl ? propsEl.textContent.replace(/\s+/g, ' ').trim() : "FILE", doc.documentElement.lang);
                        let oldMetaText = oldState[fileId] ? normalizeDateMetadata(oldState[fileId], doc.documentElement.lang) : oldState[fileId];

                        let isNewOrChanged = effectiveForceFull || !oldMetaText || oldMetaText !== metaText;
                        let zipPath = currentPath ? `${currentPath}/${fileName}` : fileName;

                        if (isNewOrChanged) {
                            try {
                                let fileRes = await fetch(fileUrl);
                                if (!fileRes.ok) throw new Error("Status " + fileRes.status);
                                zip.file(zipPath, await fileRes.blob());
                                newState[fileId] = metaText;
                            } catch (err) {
                                console.log("[Error] Course file:", err);
                                if (oldState[fileId]) newState[fileId] = oldState[fileId];
                            }
                        } else {
                            newState[fileId] = metaText;
                        }
                    }

                    let courseFolders = [];
                    doc.querySelectorAll('a[href*="goto.php/fold/"]').forEach(a => {
                        let fUrl = a.href;
                        if (fUrl) {
                            let fId = getStableKey(fUrl);
                            if (!courseFolders.some(cf => cf.id === fId)) {
                                courseFolders.push({ url: fUrl, id: fId, name: sanitize(a.textContent.trim() || "Folder") });
                            }
                        }
                    });

                    for (let folder of courseFolders) {
                        let nextPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
                        newState[folder.id] = "DIR";
                        if (effectiveForceFull || !oldState[folder.id]) zip.folder(nextPath);
                        await scanFolder(folder.url, nextPath, oldState, newState, zip, effectiveForceFull);
                    }

                    stateUpdates.push({ id: course.id, state: newState });

                } catch (e) {
                    console.log(`[Error] Course ${course.title}:`, e);
                }
            }

            let zipIsEmpty = Object.keys(zip.files).length === 0;
            if (zipIsEmpty) {
                stateUpdates.forEach(update => saveCourseState(update.id, update.state));
                alert(txt.upToDate);
                setUIState(false);
                toggleNavigationBlocker(false);
                return;
            }

            mainBtn.innerHTML = txt.zipping;

            let zipName = "ILIAS_Download.zip";
            if (courses.length === 1) {
                zipName = `${sanitize(courses[0].title)}${forceFull ? "" : "_Update"}.zip`;
            } else {
                zipName = forceFull ? "ILIAS_Favorites.zip" : "ILIAS_Favorites_Updates.zip";
            }

            zip.generateAsync({ type: "blob" }).then(function(content) {
                let link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = zipName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                stateUpdates.forEach(update => saveCourseState(update.id, update.state));
                setUIState(false);
                toggleNavigationBlocker(false);
            }).catch(function(err) {
                console.error("ZIP Generation Error:", err);
                alert(txt.zipError);
                setUIState(false);
                toggleNavigationBlocker(false);
            });
        }

        // --- EVENT LISTENER ---
        mainBtn.onclick = () => startSync(false);
        btnFull.onclick = () => startSync(true);
        btnManage.onclick = () => {
            toggleMenu(false);
            openStorageModal();
        };
        btnClear.onclick = () => {
            if(confirm(txt.confirmReset)) {
                clearAllCaches();
                toggleMenu(false);
                alert(txt.resetSuccess);
            }
        };
    }

    if (document.readyState === 'complete') {
        initialize();
    } else {
        window.addEventListener('load', initialize, { once: true });
    }
})();