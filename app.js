const { createApp, nextTick, defineAsyncComponent } = Vue;

createApp({
    data() {
        return {
            columns: [],
            loading: false,
            showGallery: false,
            galleryInitialized: false,
            showGreeting: false,
            showQuote: false,
            showModal: false,
            selectedImage: ''
        };
    },

    components: {
        AsyncCatGreeting: defineAsyncComponent({
            loader: () => new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        template: `
                            <div class="alert alert-info">
                                🐱 Привет от вашего любимого котика!
                            </div>`
                    });
                }, 1500);
            }),
            loadingComponent: {
                template: `
                    <div class="d-flex justify-content-center my-2">
                        <div class="text-light spinner-border text-info" role="status">
                            <span class="visually-hidden">Загрузка...</span>
                        </div>
                    </div>`
            },
            errorComponent: {
                template: `
                    <div class="alert alert-danger">
                        ❌ Не удалось загрузить приветствие.
                    </div>`
            },
            delay: 200,
            timeout: 5000
        }),

        AsyncCatQuote: defineAsyncComponent({
            loader: () => new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        template: `
                            <div class="p-3 mb-3 border rounded">
                                <blockquote class="blockquote mb-0 text-light">
                                    <p>«Кошки — это художники: они скрашивают наши серые будни яркими пятнами»</p>
                                    <footer class="blockquote-footer">Неизвестный автор</footer>
                                </blockquote>
                            </div>`
                    });
                }, 3000);
            }),
            loadingComponent: {
                template: `
                    <div class="alert alert-warning">
                        Загружаем цитату…
                    </div>`
            },
            errorComponent: {
                template: `
                    <div class="alert alert-danger">
                        ❌ Не удалось загрузить цитату.
                    </div>`
            },
            delay: 500,
            timeout: 7000
        })
    },

    methods: {
        toggleGallery() {
            this.showGallery = !this.showGallery;
            if (this.showGallery && !this.galleryInitialized) {
                this.galleryInitialized = true;
                this.initialLoad();
            }
        },

        getColCount() {
            const w = window.innerWidth;
            if (w >= 1200) return 4;
            if (w >= 992)  return 3;
            if (w >= 768)  return 2;
            return 1;
        },

        initColumns() {
            const cnt = this.getColCount();
            this.columns = Array.from({ length: cnt }, () => []);
        },

        addSkeletons(count) {
            const batch = [];
            for (let i = 0; i < count; i++) {
                const slot = { id: `sk-${Date.now()}-${i}`, skeleton: true };
                batch.push(slot);
                this.columns[i % this.columns.length].push(slot);
            }
            return batch;
        },

        openModal(url) {
            this.selectedImage = url;
            this.showModal = true;
        },

        closeModal() {
            this.showModal = false;
            setTimeout(() => {
                this.selectedImage = '';
            }, 400);
        },

        async replaceSkeletons(batch, data) {
            await nextTick();
            data.forEach((cat, i) => {
                const slot = batch[i];
                if (!slot) return;

                for (const col of this.columns) {
                    const idx = col.indexOf(slot);
                    if (idx !== -1) {
                        col.splice(idx, 1, {
                            id: cat.id,
                            url: cat.url,
                            skeleton: false,
                            loaded: false
                        });

                        const img = new Image();
                        img.src = cat.url;
                        img.onload = () => {
                            setTimeout(() => {
                                col[idx].loaded = true;
                            }, 100 + i * 50);
                        };
                        break;
                    }
                }
            });

            const extra = batch.length - data.length;
            if (extra > 0) {
                batch.slice(data.length).forEach(slot => {
                    for (const col of this.columns) {
                        const idx = col.indexOf(slot);
                        if (idx !== -1) {
                            col.splice(idx, 1);
                            break;
                        }
                    }
                });
            }
        },

        async loadBatch(count) {
            this.loading = true;
            const batch = this.addSkeletons(count);

            try {
                const res  = await fetch(`https://api.thecatapi.com/v1/images/search?limit=${count}`);
                const data = await res.json();
                await this.replaceSkeletons(batch, data);
            } catch (e) {
                console.error("Ошибка котиков:", e);
                batch.forEach(slot => {
                    for (const col of this.columns) {
                        const idx = col.indexOf(slot);
                        if (idx !== -1) {
                            col.splice(idx, 1);
                            break;
                        }
                    }
                });
            } finally {
                this.loading = false;
            }
        },

        async initialLoad() {
            this.initColumns();
            const h    = window.innerHeight;
            const avg  = 300;
            const cols = this.getColCount();
            const cnt  = Math.ceil(h / avg) * cols * 2;
            await this.loadBatch(cnt);
        },

        loadMore() {
            if (!this.loading) {
                this.loadBatch(this.getColCount() * 10);
            }
        }
    },

    async mounted() {
        window.addEventListener("resize", () => {
            const all = this.columns.flat();
            this.initColumns();
            all.forEach((item, i) => {
                this.columns[i % this.columns.length].push(item);
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.showModal) {
                this.closeModal();
            }
        });
    }
}).mount('#app');