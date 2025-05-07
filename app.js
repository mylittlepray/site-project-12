const { createApp, nextTick } = Vue;

createApp({
    data() {
        return {
            columns: [],
            loading: false
        };
    },
    methods: {
        getColCount() {
            const w = window.innerWidth;
            if (w >= 1200) return 4;
            if (w >= 992) return 3;
            if (w >= 768) return 2;
            return 1;
        },
        
        initColumns() {
            const cnt = this.getColCount();
            this.columns = Array.from({ length: cnt }, () => []);
        },
        
        addSkeletons(count) {
            const batchSkeletons = [];

            for (let i = 0; i < count; i++) {
                const slot = { id: `sk-${Date.now()}-${i}`, skeleton: true };
                batchSkeletons.push(slot);
                this.columns[i % this.columns.length].push(slot);
            }
            
            return batchSkeletons;
        },
        
        async replaceSkeletons(batchSkeletons, catData) {
            await nextTick();
            
            catData.forEach((cat, i) => {
                const slot = batchSkeletons[i];
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
            
            const extra = batchSkeletons.length - catData.length;
            if (extra > 0) {
                const toRemove = batchSkeletons.slice(catData.length);
                toRemove.forEach(slot => {
                    
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
            const batchSkeletons = this.addSkeletons(count);
            
            try {
                const res = await fetch(`https://api.thecatapi.com/v1/images/search?limit=${count}`);
                const data = await res.json();
                
                await this.replaceSkeletons(batchSkeletons, data);
            } 
            catch (e) {
                console.error("Ошибка котиков:", e);
                
                batchSkeletons.forEach(slot => {
                    for (const col of this.columns) {
                        const idx = col.indexOf(slot);
                        if (idx !== -1) {
                            col.splice(idx, 1);
                            break;
                        }
                    }
                });
            } 
            finally {
                this.loading = false;
            }
        },
        
        async initialLoad() {
            const h = window.innerHeight;
            const avg = 300;
            const cols = this.getColCount();
            const count = Math.ceil(h / avg) * cols * 2;
            await this.loadBatch(count);
        },
        
        loadMore() {
            if (!this.loading) {
                this.loadBatch(this.getColCount() * 10);
            }
        }
    },
    
    async mounted() {
        this.initColumns();
        await this.initialLoad();
        
        window.addEventListener("resize", () => {
            const all = this.columns.flat();
            this.initColumns();
            
            all.forEach((item, i) => {
                this.columns[i % this.columns.length].push(item);
            });
        });
    }

}).mount('#app');
