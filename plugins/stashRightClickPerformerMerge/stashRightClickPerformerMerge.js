(async function() {
    'use strict';

    /******************************************
     * USER CONFIGURATION
     ******************************************/
    const userConfig = {
        scheme: 'http', // or 'https'
        host: 'localhost', // your server IP or hostname
        port: 9999, // your server port
        apiKey: '' // your API key
    };

    // Build API URL
    const apiUrl = `${userConfig.scheme}://${userConfig.host}:${userConfig.port}/graphql`;

    // Friendly names for endpoints
    const friendlyEndpoints = {
        "https://stashdb.org/graphql": "StashDB",
        "https://theporndb.net/graphql": "ThePornDB"
    };

    // Inject CSS for the custom modal and styling
    const style = document.createElement('style');
    style.textContent = `
        #performermerge-custom-menu {
            background-color: #000;
            background: rgba(0, 0, 0, 0.3);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            position: absolute;
            border: 1px solid #ccc;
            z-index: 10000;
            padding: 10px;
        }

        #performermerge-custom-menu a {
            display: block;
            margin-bottom: 5px;
            color: white;
            text-decoration: none;
        }

        #performermerge-custom-menu a:hover {
            text-decoration: underline;
        }

        #performermerge-merge-modal {
            display: none;
            position: fixed;
            z-index: 10001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0, 0, 0, 0.5);
        }

        .performermerge-merge-modal-content {
            background: rgba(0, 0, 0, 0.3);
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .performermerge-merge-close {
            color: red;
            float: right;
            font-size: 28px;
            font-weight: bold;
        }

        .performermerge-merge-close:hover,
        .performermerge-merge-close:focus {
            color: red;
            text-decoration: none;
            cursor: pointer;
        }

        .performermerge-merge-header {
            text-align: center;
            font-size: 24px;
            margin-bottom: 20px;
        }

        .performermerge-merge-search {
            margin-bottom: 20px;
        }

        .performermerge-merge-search input {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            color: black;
        }

        .performermerge-merge-container {
            display: flex;
            justify-content: space-between;
        }

        .performermerge-merge-pane {
            width: 48%;
            background-color: rgba(0, 0, 0, 0.5);
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #ccc;
        }

        .performermerge-merge-pane img {
            display: block;
            margin: 0 auto 10px auto;
            max-width: 100px;
            max-height: 100px;
            border-radius: 8px;
        }

        .performermerge-merge-pane .performermerge-performer-result {
            padding: 8px;
            margin: 5px 0;
            background-color: rgba(0, 0, 0, 0.5);
            border: 1px solid #ccc;
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
        }

        .performermerge-merge-pane .performermerge-performer-result:hover {
            background-color: green;
        }

        .performermerge-merge-button {
            margin-top: 10px;
            padding: 10px;
            background-color: #333;
            color: #fff;
            border: none;
            cursor: pointer;
        }

        .performermerge-merge-button:hover {
            background-color: #444;
        }

        .performermerge-merge-actions {
            text-align: center;
            margin-top: 20px;
        }

        .performermerge-highlight {
            background-color: #B03608;
        }
    `;
    document.head.appendChild(style);

    // Load Toastify library
    const toastifyScript = document.createElement('script');
    toastifyScript.src = "https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.js";
    document.head.appendChild(toastifyScript);
    await new Promise(resolve => toastifyScript.onload = resolve);

    // Debounce function to limit the rate of function calls
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Function to create the custom menu
    function createCustomMenu(event) {
        // Remove existing menu if any
        const existingMenu = document.getElementById('performermerge-custom-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'performermerge-custom-menu';

        const mergePerformersLink = document.createElement('a');
        mergePerformersLink.href = '#';
        mergePerformersLink.textContent = 'Merge Performers';
        mergePerformersLink.addEventListener('click', async function(e) {
            e.preventDefault();
            menu.remove();
            const performerId = getPerformerIdFromUrl();
            await showMergeModal(performerId);
        });
        menu.appendChild(mergePerformersLink);

        document.body.appendChild(menu);

        // Adjust menu position to align to the left of the cursor
        const menuWidth = menu.offsetWidth;
        const menuLeft = event.pageX - menuWidth;
        const menuTop = event.pageY;

        menu.style.top = `${menuTop}px`;
        menu.style.left = `${menuLeft}px`;

        const handleClickOutside = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', handleClickOutside);
            }
        };

        document.addEventListener('click', handleClickOutside);
    }

    // Function to get performer ID from URL
    function getPerformerIdFromUrl() {
        const urlParts = window.location.pathname.split('/');
        if (urlParts.length > 2 && urlParts[1] === 'performers') {
            return urlParts[2];
        }
        return null;
    }

    // Function to show the merge modal
    async function showMergeModal(performerId) {
        const modal = document.createElement('div');
        modal.id = 'performermerge-merge-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'performermerge-merge-modal-content';

        const header = document.createElement('div');
        header.className = 'performermerge-merge-header';
        header.textContent = 'Merge Performers';
        modalContent.appendChild(header);

        const closeButton = document.createElement('span');
        closeButton.className = 'performermerge-merge-close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => {
            modal.style.display = 'none';
            modal.remove();
        };
        modalContent.appendChild(closeButton);

        const searchContainer = document.createElement('div');
        searchContainer.className = 'performermerge-merge-search';
        searchContainer.innerHTML = `
            <input type="text" id="performermerge-performer-search-left" placeholder="Search Performer by Name or Stash ID (Left)">
            <input type="text" id="performermerge-performer-search-right" placeholder="Search Performer by Name or Stash ID (Right)">
        `;
        modalContent.appendChild(searchContainer);

        const container = document.createElement('div');
        container.className = 'performermerge-merge-container';
        container.innerHTML = `
            <div class="performermerge-merge-pane" id="performermerge-merge-pane-left"></div>
            <div class="performermerge-merge-pane" id="performermerge-merge-pane-right"></div>
        `;
        modalContent.appendChild(container);

        const actions = document.createElement('div');
        actions.className = 'performermerge-merge-actions';
        actions.innerHTML = `
            <button class="performermerge-merge-button" id="performermerge-merge-left-to-right">Merge Left to Right</button>
            <button class="performermerge-merge-button" id="performermerge-merge-right-to-left">Merge Right to Left</button>
        `;
        modalContent.appendChild(actions);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        modal.style.display = 'block';

        document.getElementById('performermerge-performer-search-left').addEventListener('input', debounce(async (e) => {
            const searchQuery = e.target.value;
            if (searchQuery.length >= 3) {
                const performers = await searchPerformers(searchQuery);
                updateMergePane('performermerge-merge-pane-left', performers);
            }
        }, 500));

        document.getElementById('performermerge-performer-search-right').addEventListener('input', debounce(async (e) => {
            const searchQuery = e.target.value;
            if (searchQuery.length >= 3) {
                const performers = await searchPerformers(searchQuery);
                updateMergePane('performermerge-merge-pane-right', performers);
            }
        }, 500));

        document.getElementById('performermerge-merge-left-to-right').addEventListener('click', () => mergePerformers('left-to-right'));
        document.getElementById('performermerge-merge-right-to-left').addEventListener('click', () => mergePerformers('right-to-left'));

        // Auto-populate the left performer panel if performerId is present
        if (performerId) {
            const performer = await fetchPerformerDetails(performerId);
            if (performer) {
                document.getElementById('performermerge-performer-search-left').value = performer.name;
                selectPerformer('performermerge-merge-pane-left', performer);
            }
        }
    }

    // Function to search performers
    async function searchPerformers(query) {
        let gqlQuery;
        let variables;

        // Determine if the query is a stash_id or a name
        if (/^[0-9a-fA-F-]{36}$/.test(query)) {
            gqlQuery = `
                query FindPerformers($stash_id: String!) {
                    findPerformers(
                        performer_filter: {
                            stash_id_endpoint: {
                                stash_id: $stash_id,
                                modifier: INCLUDES
                            }
                        },
                        filter: { per_page: -1, direction: ASC }
                    ) {
                        performers {
                            id
                            name
                            disambiguation
                            url
                            gender
                            twitter
                            instagram
                            birthdate
                            ethnicity
                            country
                            eye_color
                            height_cm
                            measurements
                            fake_tits
                            career_length
                            tattoos
                            piercings
                            alias_list
                            image_path
                            rating100
                            details
                            death_date
                            hair_color
                            weight
                            created_at
                            updated_at
                            stash_ids {
                                endpoint
                                stash_id
                            }
                        }
                    }
                }
            `;
            variables = { stash_id: query };
        } else {
            gqlQuery = `
                query FindPerformers($filter: String!) {
                    findPerformers(
                        performer_filter: { name: { value: $filter, modifier: MATCHES_REGEX } },
                        filter: { per_page: -1, direction: ASC }
                    ) {
                        performers {
                            id
                            name
                            disambiguation
                            url
                            gender
                            twitter
                            instagram
                            birthdate
                            ethnicity
                            country
                            eye_color
                            height_cm
                            measurements
                            fake_tits
                            career_length
                            tattoos
                            piercings
                            alias_list
                            image_path
                            rating100
                            details
                            death_date
                            hair_color
                            weight
                            created_at
                            updated_at
                            stash_ids {
                                endpoint
                                stash_id
                            }
                        }
                    }
                }
            `;
            variables = { filter: "(?i)" + query };
        }

        try {
            const response = await graphqlRequest(gqlQuery, variables, config.apiKey);
            return response.data.findPerformers.performers;
        } catch (error) {
            console.error('Error searching performers:', error);
            return [];
        }
    }

    // Function to update the merge pane with search results
    function updateMergePane(paneId, performers) {
        const pane = document.getElementById(paneId);
        pane.innerHTML = '';
        performers.forEach(performer => {
            const performerDiv = document.createElement('div');
            performerDiv.className = 'performermerge-performer-result';
            performerDiv.textContent = `${performer.name} (ID: ${performer.id})${performer.disambiguation ? ` - ${performer.disambiguation}` : ''}`;
            performerDiv.onclick = () => selectPerformer(paneId, performer);
            pane.appendChild(performerDiv);
        });
    }

    // Function to select a performer for comparison
    async function selectPerformer(paneId, performer) {
        const pane = document.getElementById(paneId);
        const stashIds = performer.stash_ids.map(id => `${friendlyEndpoints[id.endpoint] || id.endpoint}: ${id.stash_id}`).join(', ');

        pane.innerHTML = `
            <img src="${performer.image_path}/image.jpg" alt="${performer.name}">
            <h3>${performer.name} ${performer.disambiguation ? `(${performer.disambiguation})` : ''}</h3>
            <div data-field="name"><strong>ID:</strong> ${performer.id}</div>
            <div data-field="disambiguation"><strong>Disambiguation:</strong> ${performer.disambiguation}</div>
            <div data-field="url"><strong>URL:</strong> <a href="${performer.url}" target="_blank">${performer.url}</a></div>
            <div data-field="gender"><strong>Gender:</strong> ${performer.gender}</div>
            <div data-field="twitter"><strong>Twitter:</strong> ${performer.twitter}</div>
            <div data-field="instagram"><strong>Instagram:</strong> ${performer.instagram}</div>
            <div data-field="birthdate"><strong>Birthdate:</strong> ${performer.birthdate}</div>
            <div data-field="ethnicity"><strong>Ethnicity:</strong> ${performer.ethnicity}</div>
            <div data-field="country"><strong>Country:</strong> ${performer.country}</div>
            <div data-field="eye_color"><strong>Eye Color:</strong> ${performer.eye_color}</div>
            <div data-field="height_cm"><strong>Height (cm):</strong> ${performer.height_cm}</div>
            <div data-field="measurements"><strong>Measurements:</strong> ${performer.measurements}</div>
            <div data-field="fake_tits"><strong>Fake Tits:</strong> ${performer.fake_tits}</div>
            <div data-field="career_length"><strong>Career Length:</strong> ${performer.career_length}</div>
            <div data-field="tattoos"><strong>Tattoos:</strong> ${performer.tattoos}</div>
            <div data-field="piercings"><strong>Piercings:</strong> ${performer.piercings}</div>
            <div data-field="alias_list"><strong>Aliases:</strong> ${performer.alias_list.join(', ')}</div>
            <div data-field="rating100"><strong>Rating:</strong> ${performer.rating100 / 10}/10</div>
            <div data-field="details"><strong>Details:</strong> ${performer.details}</div>
            <div data-field="death_date"><strong>Death Date:</strong> ${performer.death_date}</div>
            <div data-field="hair_color"><strong>Hair Color:</strong> ${performer.hair_color}</div>
            <div data-field="weight"><strong>Weight:</strong> ${performer.weight}</div>
            <div data-field="created_at"><strong>Created At:</strong> ${performer.created_at}</div>
            <div data-field="updated_at"><strong>Updated At:</strong> ${performer.updated_at}</div>
            <div data-field="stash_ids"><strong>Stash IDs:</strong> ${stashIds}</div>
        `;
        pane.dataset.selectedPerformerId = performer.id;
        pane.dataset.selectedPerformerData = JSON.stringify(performer);

        // Fetch galleries and scenes for the selected performer
        await searchGalleries(paneId, performer.id);
        await searchScenes(paneId, performer.id);

        // Highlight differences if both panes have performers selected
        if (document.getElementById('performermerge-merge-pane-left').dataset.selectedPerformerId && document.getElementById('performermerge-merge-pane-right').dataset.selectedPerformerId) {
            highlightDifferences();
        }
    }

    // Function to highlight differences between two selected performers
    function highlightDifferences() {
        const leftPane = document.getElementById('performermerge-merge-pane-left');
        const rightPane = document.getElementById('performermerge-merge-pane-right');

        const leftPerformer = JSON.parse(leftPane.dataset.selectedPerformerData);
        const rightPerformer = JSON.parse(rightPane.dataset.selectedPerformerData);

        const fields = [
            'name', 'disambiguation', 'url', 'gender', 'twitter', 'instagram',
            'birthdate', 'ethnicity', 'country', 'eye_color', 'height_cm',
            'measurements', 'fake_tits', 'career_length', 'tattoos', 'piercings',
            'alias_list', 'rating100', 'details', 'death_date',
            'hair_color', 'weight', 'created_at', 'updated_at', 'stash_ids'
        ];

        fields.forEach(field => {
            const leftFieldElement = leftPane.querySelector(`[data-field="${field}"]`);
            const rightFieldElement = rightPane.querySelector(`[data-field="${field}"]`);

            if (leftFieldElement && rightFieldElement && JSON.stringify(leftPerformer[field]) !== JSON.stringify(rightPerformer[field])) {
                leftFieldElement.classList.add('performermerge-highlight');
                rightFieldElement.classList.add('performermerge-highlight');
            } else {
                if (leftFieldElement) leftFieldElement.classList.remove('performermerge-highlight');
                if (rightFieldElement) rightFieldElement.classList.remove('performermerge-highlight');
            }
        });
    }

    // Function to search galleries for a performer
    async function searchGalleries(paneId, performerId) {
        const gqlQuery = `
            query FindGalleries($performer_id: [ID!]) {
                findGalleries(
                    gallery_filter: { performers: { modifier: INCLUDES, value: $performer_id } },
                    filter: { per_page: -1 }
                ) {
                    galleries {
                        id
                    }
                }
            }
        `;
        const variables = { performer_id: [performerId] };

        try {
            const response = await graphqlRequest(gqlQuery, variables, config.apiKey);
            const galleryIds = response.data.findGalleries.galleries.map(gallery => gallery.id);
            console.log(`Galleries for ${paneId}:`, galleryIds);
            document.getElementById(paneId).dataset.galleryIds = JSON.stringify(galleryIds);
        } catch (error) {
            console.error(`Error searching galleries for ${paneId}:`, error);
        }
    }

    // Function to search scenes for a performer
    async function searchScenes(paneId, performerId) {
        const gqlQuery = `
            query FindScenes($performer_id: [ID!]) {
                findScenes(
                    scene_filter: { performers: { modifier: INCLUDES, value: $performer_id } },
                    filter: { per_page: -1 }
                ) {
                    scenes {
                        id
                    }
                }
            }
        `;
        const variables = { performer_id: [performerId] };

        try {
            const response = await graphqlRequest(gqlQuery, variables, config.apiKey);
            const sceneIds = response.data.findScenes.scenes.map(scene => scene.id);
            console.log(`Scenes for ${paneId}:`, sceneIds);
            document.getElementById(paneId).dataset.sceneIds = JSON.stringify(sceneIds);
        } catch (error) {
            console.error(`Error searching scenes for ${paneId}:`, error);
        }
    }

    // Function to transfer related items (galleries and scenes) to the target performer
    async function transferRelatedItems(sourcePerformerId, targetPerformerId) {
        const sourcePane = document.getElementById(`performermerge-merge-pane-${sourcePerformerId === document.getElementById('performermerge-merge-pane-left').dataset.selectedPerformerId ? 'left' : 'right'}`);
        const galleryIds = JSON.parse(sourcePane.dataset.galleryIds || '[]');
        const sceneIds = JSON.parse(sourcePane.dataset.sceneIds || '[]');

        for (const galleryId of galleryIds) {
            await updateGallery(galleryId, targetPerformerId);
        }

        for (const sceneId of sceneIds) {
            await updateScene(sceneId, targetPerformerId);
        }
    }

    // Function to merge performers
    async function mergePerformers(direction) {
        const leftPane = document.getElementById('performermerge-merge-pane-left');
        const rightPane = document.getElementById('performermerge-merge-pane-right');
        const leftPerformerId = leftPane.dataset.selectedPerformerId;
        const rightPerformerId = rightPane.dataset.selectedPerformerId;

        if (!leftPerformerId || !rightPerformerId) {
            showToast('Please select performers to merge', 'error');
            return;
        }

        const sourcePerformerId = direction === 'left-to-right' ? leftPerformerId : rightPerformerId;
        const targetPerformerId = direction === 'left-to-right' ? rightPerformerId : leftPerformerId;

        try {
            const sourcePerformer = await fetchPerformerDetails(sourcePerformerId);
            const targetPerformer = await fetchPerformerDetails(targetPerformerId);

            const validFields = [
                'id', 'name', 'disambiguation', 'url', 'gender', 'twitter', 'instagram',
                'birthdate', 'ethnicity', 'country', 'eye_color', 'height_cm',
                'measurements', 'fake_tits', 'career_length', 'tattoos', 'piercings',
                'alias_list', 'rating100', 'details', 'death_date', 'hair_color', 'weight',
                'created_at', 'updated_at', 'stash_ids'
            ];

            const updatedData = { id: targetPerformerId };
            const appendedStashIds = [...targetPerformer.stash_ids, ...sourcePerformer.stash_ids].reduce((acc, id) => {
                const existing = acc.find(e => e.stash_id === id.stash_id);
                if (!existing) acc.push(id);
                return acc;
            }, []);

            for (const key in sourcePerformer) {
                if (validFields.includes(key)) {
                    if (key === 'alias_list') {
                        // Merge unique aliases
                        const mergedAliases = Array.from(new Set([...targetPerformer.alias_list, ...sourcePerformer.alias_list]));
                        updatedData.alias_list = mergedAliases;
                    } else if (key === 'disambiguation') {
                        // Merge disambiguations
                        const mergedDisambiguation = targetPerformer.disambiguation
                            ? `${targetPerformer.disambiguation}, ${sourcePerformer.disambiguation}`
                            : sourcePerformer.disambiguation;
                        updatedData.disambiguation = mergedDisambiguation;
                    } else if (key === 'stash_ids') {
                        // Append stash IDs
                        updatedData.stash_ids = appendedStashIds;
                    } else if (!targetPerformer[key] && sourcePerformer[key]) {
                        updatedData[key] = sourcePerformer[key];
                    }
                }
            }

            // Remove duplicate aliases
            updatedData.alias_list = [...new Set(updatedData.alias_list)];
            console.log('Prefilter AliasList for Mutation:', updatedData.alias_list); // Log the mutation data

            // Remove target performer name from alias list
            updatedData.alias_list = updatedData.alias_list.filter(e => e.toLowerCase() !== targetPerformer.name.toLowerCase());
            console.log('Updated AliasList for Mutation:', updatedData.alias_list); // Log the mutation data

            console.log('Updated Data for Mutation:', updatedData); // Log the mutation data

            await updatePerformer({ id: targetPerformerId, name: `${targetPerformer.name}_temp` });
            console.log('Updating Data for Mutation:', updatedData); // Log the mutation data
            await updatePerformer(updatedData);
            console.log('Completed Updating Data for Mutation:', updatedData); // Log the mutation data
            await deletePerformer(sourcePerformerId);
            console.log('Deleting Merged Performer:', sourcePerformerId); // Log the mutation data
            await updatePerformer({ id: targetPerformerId, name: targetPerformer.name });

            // Transfer related items (galleries and scenes) to the target performer
            console.log('Transferring Items to Performer:', sourcePerformerId); // Log the mutation data
            await transferRelatedItems(sourcePerformerId, targetPerformerId);

            showToast('Performers merged successfully', 'success');
            document.getElementById('performermerge-merge-modal').remove();
        } catch (error) {
            console.error('Error merging performers:', error);
            showToast('Error merging performers', 'error');
        }
    }

    // Function to fetch performer details
    async function fetchPerformerDetails(performerId) {
        const gqlQuery = `
            query FindPerformer($id: ID!) {
                findPerformer(id: $id) {
                    id
                    name
                    disambiguation
                    url
                    gender
                    twitter
                    instagram
                    birthdate
                    ethnicity
                    country
                    eye_color
                    height_cm
                    measurements
                    fake_tits
                    career_length
                    tattoos
                    piercings
                    alias_list
                    image_path
                    rating100
                    details
                    death_date
                    hair_color
                    weight
                    created_at
                    updated_at
                    stash_ids {
                        endpoint
                        stash_id
                    }
                }
            }
        `;
        const variables = { id: performerId };
        const response = await graphqlRequest(gqlQuery, variables, config.apiKey);
        const performer = response.data.findPerformer;
        const pane = document.querySelector(`[data-selected-performer-id="${performerId}"]`);
        if (pane) {
            pane.dataset.selectedPerformerData = JSON.stringify(performer);
        }
        return performer;
    }

    // Function to update performer
    async function updatePerformer(performerData) {
        const gqlMutation = `
            mutation PerformerUpdate($input: PerformerUpdateInput!) {
                performerUpdate(input: $input) {
                    id
                }
            }
        `;
        const input = performerData;

        console.log('GraphQL Mutation:', gqlMutation); // Log the mutation query
        console.log('Mutation Variables:', { input }); // Log the mutation variables

        const response = await graphqlRequest(gqlMutation, { input }, config.apiKey);

        console.log('GraphQL Response:', response); // Log the mutation response

        if (response.errors) {
            console.error('Mutation Errors:', response.errors);
        }
    }

    // Function to delete performer
    async function deletePerformer(performerId) {
        const gqlMutation = `
            mutation PerformerDestroy($input: PerformerDestroyInput!) {
                performerDestroy(input: $input)
            }
        `;
        const input = { id: performerId };

        console.log('Delete Mutation:', gqlMutation); // Log the delete mutation query
        console.log('Delete Variables:', { input }); // Log the delete mutation variables

        const response = await graphqlRequest(gqlMutation, { input }, config.apiKey);

        console.log('Delete Response:', response); // Log the delete mutation response

        if (response.errors) {
            console.error('Mutation Errors:', response.errors);
        }
    }

    // Function to update gallery
    async function updateGallery(galleryId, performerId) {
        const gqlMutation = `
            mutation GalleryUpdate($input: GalleryUpdateInput!) {
                galleryUpdate(input: $input) {
                    id
                }
            }
        `;
        const input = { id: galleryId, performer_ids: [performerId] };

        console.log('Updating gallery:', input); // Log the update data

        const response = await graphqlRequest(gqlMutation, { input }, config.apiKey);

        console.log('Gallery Update Response:', response); // Log the mutation response

        if (response.errors) {
            console.error('Gallery Update Errors:', response.errors);
        }
    }

    // Function to update scene
    async function updateScene(sceneId, performerId) {
        const gqlMutation = `
            mutation SceneUpdate($input: SceneUpdateInput!) {
                sceneUpdate(input: $input) {
                    id
                }
            }
        `;
        const input = { id: sceneId, performer_ids: [performerId] };

        console.log('Updating scene:', input); // Log the update data

        const response = await graphqlRequest(gqlMutation, { input }, config.apiKey);

        console.log('Scene Update Response:', response); // Log the mutation response

        if (response.errors) {
            console.error('Scene Update Errors:', response.errors);
        }
    }

    // GraphQL request function
    async function graphqlRequest(query, variables = {}, apiKey = '') {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Apikey': apiKey
            },
            body: JSON.stringify({ query, variables })
        });
        return response.json();
    }

    const config = {
        serverUrl: apiUrl,
        apiKey: userConfig.apiKey
    };

    // Function to show toast notifications
    function showToast(message, type = "success") {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "center",
            backgroundColor: type === "success" ? "green" : "red",
        }).showToast();
    }

    // Function to handle right-click on the dropdown menu button
    document.addEventListener('contextmenu', function(event) {
        const dropdownButton = event.target.closest('button#more-menu');
        if (dropdownButton) {
            event.preventDefault();
            createCustomMenu(event);
        }
    });

})();
