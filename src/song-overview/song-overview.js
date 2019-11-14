/*
 * My Songbook - Beispielanwendung der Anleitung zur Entwicklung einer Browser App
 *
 * © 2018 Dennis Schulmeister-Zimolong <dhbw@windows3.de>
 * Lizenz: Creative Commons Namensnennung 4.0 International
 *
 * Sie dürfen:
 *
 *     Teilen — das Material in jedwedem Format oder Medium vervielfältigen
 *     und weiterverbreiten
 *
 *     Bearbeiten — das Material remixen, verändern und darauf aufbauen
 *     und zwar für beliebige Zwecke, sogar kommerziell.
 *
 * Unter folgenden Bedingungen:
 *
 *     Namensnennung — Sie müssen angemessene Urheber- und Rechteangaben
 *     machen, einen Link zur Lizenz beifügen und angeben, ob Änderungen
 *     vorgenommen wurden. Diese Angaben dürfen in jeder angemessenen Art
 *     und Weise gemacht werden, allerdings nicht so, dass der Eindruck
 *     entsteht, der Lizenzgeber unterstütze gerade Sie oder Ihre Nutzung
 *     besonders.
 *
 *     Keine weiteren Einschränkungen — Sie dürfen keine zusätzlichen Klauseln
 *     oder technische Verfahren einsetzen, die anderen rechtlich irgendetwas
 *     untersagen, was die Lizenz erlaubt.
 *
 * Es werden keine Garantien gegeben und auch keine Gewähr geleistet.
 * Die Lizenz verschafft Ihnen möglicherweise nicht alle Erlaubnisse,
 * die Sie für die jeweilige Nutzung brauchen. Es können beispielsweise
 * andere Rechte wie Persönlichkeits- und Datenschutzrechte zu beachten
 * sein, die Ihre Nutzung des Materials entsprechend beschränken.
 */
"use strict";

import stylesheet from "./song-overview.css";
import Database from "../database.js";

/**
 * View mit der Übersicht der vorhandenen Songs.
 */
class SongOverview {
    /**
     * Konstruktor,
     * @param {Objekt} app Zentrales App-Objekt der Anwendung
     */
    constructor(app) {
        this._app = app;

        // Suche und Sortierung
        this._order = "";
        this._sort = "";
        this._searchTimeout = null;

        this._sortButtons = null;
        this._searchField = null;
        this._listElement = null;
    }

    /**
     * Von der Klasse App aufgerufene Methode, um die Seite anzuzeigen. Die
     * Methode gibt daher ein passendes Objekt zurück, das an die Methode
     * _switchVisibleContent() der Klasse App übergeben werden kann, um ihr
     * die darzustellenden DOM-Elemente mitzuteilen.
     *
     * @return {Object} Darzustellende DOM-Elemente gemäß Beschreibung der
     * Methode App._switchVisibleContent()
     */
    async onShow() {
        let section = document.querySelector("#song-overview").cloneNode(true);

        this._sortButtons = section.querySelectorAll("header .cmd-sort");
        this._searchField = section.querySelector("header .search");
        this._listElement = section.querySelector("main > ul");

        this._searchAndUpdateView("", "title");

        // Event Listener zum Sortieren der Liste
        this._sortButtons.forEach(element => {
            element.addEventListener("click", event => {
                this._searchAndUpdateView(this._query, element.dataset.sortBy);
                event.preventDefault();
            });
        });

        // Event Listener zum Suchen von Songs
        this._searchField.addEventListener("keyup", event => {
            if (event.key === "Enter") {
                // Bei Enter sofort suchen
                this._searchAndUpdateView(this._searchField.value, this._sort);

                if (this._searchTimeout) {
                    window.clearTimeout(this._searchTimeout);
                    this._searchTimeout = null;
                }
            } else {
                // Bei sonstigem Tastendruck nur alle halbe Sekunde suchen
                if (!this._searchTimeout) {
                    this._searchTimeout = window.setTimeout(() => {
                        this._searchAndUpdateView(this._searchField.value, this._sort);
                        this._searchTimeout = null;
                    }, 500);
                }
            }
        });

        return {
            className: "song-overview",
            topbar: section.querySelectorAll("header > *"),
            main: section.querySelectorAll("main > *"),
        };
    }

    /**
     * Von der Klasse App aufgerufene Methode, um festzustellen, ob der Wechsel
     * auf eine neue Seite erlaubt ist. Wird hier true zurückgegeben, wird der
     * Seitenwechsel ausgeführt.
     *
     * @param  {Function} goon Callback, um den Seitenwechsel zu einem späteren
     * Zeitpunkt fortzuführen, falls wir hier false zurückgeben
     * @return {Boolean} true, wenn der Seitenwechsel erlaubt ist, sonst false
     */
    async onLeave(goon) {
        return true;
    }

    /**
     * @return {String} Titel für die Titelzeile des Browsers
     */
    get title() {
        return "Übersicht";
    }

    /**
     * Diese Methode greift auf die Datenbank zu und sucht die gespeicherten
     * Songs. Optional kann ein Suchbegriff mitgegeben werden, der innerhalb
     * des Songtitels oder des Künstlernamens vorkommen muss. Ebenso kann
     * einer von folgenden Werten mitgegeben werden, um die Ergebnisliste zu
     * sortieren:
     *
     *   * "title": Sortierung nach Songtitel und Künstler
     *   * "artist": Sortierung nach Künstler und Songtitel
     *
     * Die Ergebnisliste hat folgendes Format:
     *
     * [
     *      {
     *          id: "Datenbank-ID",                 // Schlüsselwert der Datenbank
     *          artist: "Name des Künstlers",       // Name des Künstlers
     *          title: "Name des Songs",            // Name des Songs
     *          format: "html",                     // Bisher immer "html"
     *          data: "HTML-String",                // HTML-String mit Songinhalt
     *      }, {
     *        …
     *      }
     * ]
     *
     * @param  {String} query Suchbegriff (optional)
     * @param  {String} sort Sortierung (optional)
     * @return {Array} Liste der gefundenen Songs
     */
    async _searchSongs(query, sort) {
        // Songs suchen
        let songtexts = new Database.Songtexts();
        let songs = await songtexts.search(query);

        // Ergebnis sortieren
        songs.sort((lhs, rhs) => {
            let resultArtist = lhs.artist.localeCompare(rhs.artist);
            let resultTitle = lhs.title.localeCompare(rhs.title);

            if (sort === "artist") {
                // Sortierung nach Künstler und Songtitel
                if (resultArtist != 0) {
                    return resultArtist;
                } else {
                    return resultTitle;
                }
            } else {
                // Sortierung nach Songtitel und Künstler
                if (resultTitle != 0) {
                    return resultTitle;
                } else {
                    return resultArtist;
                }
            }
        });

        return songs;
    }

    /**
     * Diese Methode nimmt die von searchSongs() generierte Liste mit Songtexten
     * entgegen und zeigt sie auf der Seite an. Hierfür muss der Methode über
     * den Parameter groupBy einer von folgenden beiden Strings mitgegeben
     * werden:
     *
     *   * "title": Gruppierung anhand erstem Buchstaben des Titels
     *   * "artist": Gruppierung anhand des Künstlers
     *
     * Im Parameter parentNode muss das <ul>-Element übergeben werden, in
     * welches die Listeneinträge eingefügt werden sollen.
     *
     * @param {Array} songs Liste der darzustellenden Songs
     * @param {String} groupBy Kriterium für die Zwischenüberschriften
     * @param {HTMLNode} parentNode <ul>-Element der Liste
     */
    _renderList(songs, groupBy, parentNode) {
        parentNode.innerHTML = "";

        if (songs.length < 1) {
            // Hinweistext, wenn noch keine Songs vorhanden sind
            parentNode.innerHTML += `
                <li>
                    <div class="padding no-data">
                        Noch keine Texte vorhanden
                    </div>
                </li>
            `;
        } else {
            // Zwischenüberschriften und Songtexte
            let currentGroup = "";

            songs.forEach(song => {
                // Zwischenüberschrift zur Gruppierung der Songs
                //
                // <li data-section-title="A">
                //     <div class="section-title">
                //         A
                //     </div>
                // </li>
                let songGroup1 = "";
                let songGroup2 = "";

                if (groupBy === "title") {
                    songGroup1 = song.title.trim()[0].toUpperCase();
                    songGroup2 = songGroup1;
                } else {
                    songGroup1 = song.artist.trim();
                    songGroup2 = songGroup1.toUpperCase();
                }

                if (currentGroup != songGroup2) {
                    currentGroup = songGroup2;

                    let liGroup = document.createElement("li");
                    liGroup.dataset.sectionTitle = songGroup1;

                    let divGroup = document.createElement("div");
                    divGroup.classList.add("section-title");
                    divGroup.textContent = songGroup1;

                    parentNode.appendChild(liGroup);
                    liGroup.appendChild(divGroup);
                }

                // Der eigentliche Song
                //
                // <li class="entry" data-song-title="Another Day In Paradise" data-song-artist="Phil Collins">
                //     <div class="song-title">
                //         Another Day In Paradise
                //     </div>
                //     <div class="song-artist">
                //         Phil Collins
                //     </div>
                // </li>
                let liSong = document.createElement("li");
                liSong.classList.add("entry");
                liSong.dataset.songTitle = song.title.trim();
                liSong.dataset.songArtist = song.artist.trim();

                let divTitle = document.createElement("div");
                divTitle.classList.add("song-title");
                divTitle.textContent = song.title.trim();

                let divArtist = document.createElement("div");
                divArtist.classList.add("song-artist");
                divArtist.textContent = song.artist.trim();

                parentNode.appendChild(liSong);
                liSong.appendChild(divTitle);
                liSong.appendChild(divArtist);
            });
        }
    }

    /**
     * Diese Methode umhüllt die beiden Methoden _searchSongs() und
     * _renderList(), um die Liste der darzustellenden Songs zu ermitteln
     * und anzuzeigen. Dabei werden auch die anderen Inhalte der Seite
     * wie die Toolbar oder das Suchfeld aktualisiert.
     *
     * @param  {String} query Suchbegriff
     * @param  {String} sort Sortierung und Gruppierung
     */
    async _searchAndUpdateView(query, sort) {
        // Songs suchen und anzeigen
        this._query = query;
        this._sort = sort;

        let songs = await this._searchSongs(query, sort);
        this._renderList(songs, sort, this._listElement);

        // Sortierbuttons in der Toolbar umschalten
        this._sortButtons.forEach(element => {
            if (element.dataset.sortBy === sort) {
                element.classList.add("hidden");
            } else {
                element.classList.remove("hidden");
            }
        });

        // Text im Suchfeld aktualisieren
        if (!this._searchField.value === query) {
            this._searchField.value = query;
        }
    }
}

export default SongOverview;
