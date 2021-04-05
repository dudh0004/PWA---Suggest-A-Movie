import {
  get,
  set
} from 'https://cdn.jsdelivr.net/npm/idb-keyval@5/dist/esm/index.js';
const APP = {
  BASE_URL: 'https://api.themoviedb.org/3/',
  IMG_URL: 'https://image.tmdb.org/t/p/',
  backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
  logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
  poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
  profile_sizes: ['w45', 'w185', 'h632', 'original'],
  still_sizes: ['w92', 'w185', 'w300', 'original'],
  API_KEY: '819ff85b3d0216f0611f8ae0e97b2227',
  isOnline: 'onLine' in navigator && navigator.onLine,
  isStandalone: false,
  sw: null, 
  keyword:'',
  deferredPrompt:true,
  init() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        .then(registration => {
        APP.sw = registration.installing ||
                  registration.waiting || 
                  registration.active;
                console.log('service worker registered');
      });
      (error) => {
        console.log('Service worker registration failed:', error);
      };

      if(navigator.serviceWorker.controller){
        console.log('we have a service worker installed.');
      }

      navigator.serviceWorker.oncontrollerchange = (ev) => {
        console.log('New service worker activated');
      };
      navigator.serviceWorker.addEventListener('message', APP.onMessage);
    } else {
      console.log('Service workers are not supported.');
    }
  
    APP.pageLoaded();

    APP.addListeners();

    //check if the app was launched from installed version
    if (navigator.standalone) {
      APP.isStandalone = true;
    } else if (matchMedia('(display-mode: standalone)').matches) {
      APP.isStandalone = true;
    } else {
      APP.isStandalone = false;
    }
  },
  pageLoaded() {
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    APP.keyword = keyword;
    if (keyword) {
      console.log(`on results.html - startSearch(${keyword})`);
      APP.startSearch(keyword);
    }
    let mid = parseInt(params.get('movie_id'));
    let ref = params.get('ref');
    if (mid && ref) {
      console.log(`look in db for movie_id ${mid} or do fetch`);
      APP.startSuggest({ mid, ref});
    }
  },
  addListeners() {
    window.addEventListener('online', (ev) => {
      console.log('you are online');
    });
    window.addEventListener('offline', (ev) => {
      console.log('you are offline');
    });
    
    window.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      APP.deferredPrompt = ev;
      console.log('saved the install event');
    });

    let search = document.getElementById('search');
    search.addEventListener('click',APP.startChromeInstall);
  
    //listen for sign that app was installed
    window.addEventListener('appinstalled', (evt) => {
      console.log('app was installed');
    });

    //listen for submit of the search form
    let searchForm = document.searchForm;
    if (searchForm) {
      document.searchForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        //build the queryString and go to the results page
        let searchInput = document.getElementById('search');
        let keyword = searchInput.value.trim();
        APP.keyword = keyword;
        if (keyword) {
          let base = location.origin;
          let url = new URL('./results.html', base);
          url.search = '?keyword=' + encodeURIComponent(keyword);
          location.href = url;
        }
      });
    }

    let movies = document.querySelector('.movies');
    if (movies) {
      movies.addEventListener('click', (ev) => {
        ev.preventDefault();
        let anchor = ev.target;
        if (anchor.tagName === 'A') {
          let card = anchor.closest('.card');
          let title = card.querySelector('.card-title span').textContent;
          let mid = card.getAttribute('data-id');
          let base = location.origin;
          let url = new URL('./suggest.html', base);
          url.search = `?movie_id=${mid}&ref=${encodeURIComponent(title)}`;
          location.href = url;
        }
      });
    }
  },
  async startChromeInstall() {
    let countvalue = 'PromptValue';
    let Value = await get(`${countvalue}`);
    console.log(Value);
    if(!Value) {
      console.log('value undefined');
      if(APP.deferredPrompt) {
        console.log(APP.deferredPrompt);
        APP.deferredPrompt.prompt();
        APP.deferredPrompt.userChoice.then(choice=>{
        if(choice.outcome == 'accepted'){
          console.log('installed');
        } else {
          console.log('cancel');
        }
      });
    }
    set(`${countvalue}`, 1);
    }
  },
  sendMessage(msg) {
    if(navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg);
    }
  },
  onMessage({ data }) {
    console.log('Web page receiving', data)
  },
  async startSearch(keyword) {
    let para = document.querySelector('.para1');
    para.textContent = `Search Results for ${APP.keyword}`;

    if (keyword) {
      let results = await get(`${APP.keyword}`);
      let url = `${APP.BASE_URL}search/movie?api_key=${APP.API_KEY}&query=${keyword}`;
      if(results)
      {
        APP.results = results;
        APP.sendMessage({movieList: APP.results});
        APP.useSearchResults(APP.results);
        console.log('Data fetched from IndexedDB');
      } else {
        APP.getData(url, (data) => {
        set(`${APP.keyword}`, data.results);
        console.log('Data fetched from API');
        APP.results = data.results;
        console.log(APP.results);

        APP.sendMessage({movieList: data.results});
        APP.useSearchResults(keyword);
      });
    }
  }
},
  useSearchResults(keyword) {
    let movies = APP.results;
    let keywordSpan = document.querySelector('.ref-keyword');
    if (keyword && keywordSpan) {
      keywordSpan.textContent = keyword;
    }
    APP.buildList(movies);
  },
  async startSuggest({ mid, ref }) {
    let results = await get(`Suggest-${mid}`);
    let url = `${APP.BASE_URL}movie/${mid}/similar?api_key=${APP.API_KEY}&ref=${ref}`;

    let para1 = document.querySelector('.para2');
    para1.textContent = `Suggested Movies based on ${ref}`;
    
    if(results)
      {
        APP.results = results;
        console.log('Suggested movie from indexedDB');
        APP.sendMessage({movieList: APP.results});
        APP.useSearchResults(ref);
      } else {
        APP.getData(url, (data) => {
        set(`Suggest-${mid}`, data.results);
          console.log('Suggested movie from fetch API');
        APP.suggestedResults = data.results;
        APP.useSuggestedResults(ref);
    });
  };
},
  useSuggestedResults(ref) {
    let movies = APP.suggestedResults;
    let titleSpan = document.querySelector('#suggested .ref-movie');

    console.log('ref title', ref);
    if (ref && titleSpan) {
      titleSpan.textContent = ref;
    }
    APP.buildList(movies);
  },
  getData: async (url, cb) => {
    fetch(url)
      .then((resp) => {
        if (resp.ok) {
          return resp.json();
        } else {
          let msg = resp.statusText;
          throw new Error(`Could not fetch movies. ${msg}.`);
        }
      })
      .then((data) => {
        //callback
        cb(data);
      })
      .catch((err) => {
        console.warn(err);
        cb({ code: err.code, message: err.message, results: [] });
      });
  },
  buildList: (movies) => {
    console.log(`show ${movies.length} cards`);
    let container = document.querySelector(`.movies`);
    if (container) {
      if (movies.length > 0) {
        container.innerHTML = movies
          .map((obj) => {
            let img = './img/icon-512x512.png';
            if (obj.poster_path != null) {
              img = APP.IMG_URL + 'w500/' + obj.poster_path;
            }
            return `<div class="card large" data-id="${obj.id}">
          <div class="card-image">
            <img src="${img}" alt="movie poster" />
            </div>
          <div class="card-content activator">
            <h3 class="card-title purple-text text-darken-1"><span>${obj.title}</span><i class="material-icons right">more_vert</i></h3>
          </div>
          <div class="card-reveal">
            <span class="card-title purple-text purple-darken-4">${obj.title}<i class="material-icons right">close</i></span>
            <h6 class="purple-text purple-lighten-5">${obj.release_date}</h6>
            <p class="purple-text purple-accent-4">${obj.overview}</p>
          </div>
          <div class="card-action">
            <a href="./suggest.html" class="find-suggested light-blue-text text-darken-3">Show Similar</a>
          </div>
        </div>`
          })
          .join('\n');
      } else {
        //no cards
        container.innerHTML = `<div class="card">
          <div class="card-content">
            <h3 class="card-title activator"><span>No Content Available.</span></h3>
          </div>
        </div>`;
      }
    }
  },
};

document.addEventListener('DOMContentLoaded', APP.init);
