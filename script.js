// Import Supabase client dari CDN
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// Konfigurasi Supabase
const supabaseUrl = 'https://pagjistcfvcdmszseppe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZ2ppc3RjZnZjZG1zenNlcHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNDY0ODEsImV4cCI6MjA2NDkyMjQ4MX0.WPFK_00VpTANkFoshhxmeZ461c8Ianwq8akYX2RX594'
const supabase = createClient(supabaseUrl, supabaseKey)

// Elemen DOM
const gallery = document.getElementById('gallery')
const uploadBtn = document.getElementById('upload-btn')
const fileInput = document.getElementById('file-input')
const progressBar = document.getElementById('progress-bar')
const progressContainer = document.getElementById('progress-container')
const progressText = document.getElementById('progress-text')
const uploadCount = document.getElementById('upload-count')
const filterBtns = document.querySelectorAll('.filter-btn')
const modal = document.getElementById('modal')
const modalImg = document.getElementById('modal-img')
const modalCaption = document.getElementById('modal-caption')
const closeModal = document.getElementById('close-modal')
const prevBtn = document.getElementById('prev-btn')
const nextBtn = document.getElementById('next-btn')
const favoriteBtn = document.getElementById('favorite-btn')
const downloadBtn = document.getElementById('download-btn')
const shareBtn = document.getElementById('share-btn')
const dropZone = document.getElementById('drop-zone')
const searchInput = document.getElementById('search-input')
const sortSelect = document.getElementById('sort-select')
const viewBtns = document.querySelectorAll('.view-btn')
const loadMoreBtn = document.getElementById('load-more')
const themeSwitch = document.getElementById('theme-switch')

// State aplikasi
let currentImages = []
let currentIndex = 0
let favorites = JSON.parse(localStorage.getItem('favorites')) || []
let viewMode = 'grid'
let currentFilter = 'all'
let currentSort = 'newest'
let currentPage = 1
const itemsPerPage = 12

// Inisialisasi Masonry
let masonry = null

// Kategori untuk simulasi
const categories = ['nature', 'people', 'urban', 'abstract']

// Fungsi untuk menampilkan gambar dari Supabase
async function displayImages() {
  try {
    gallery.innerHTML = `
      <div class="empty-state animate__animated animate__fadeIn">
        <div class="loading-spinner"></div>
        <h3>Memuat gambar...</h3>
      </div>
    `

    // Dapatkan daftar file dari storage
    const { data: files, error } = await supabase
      .storage
      .from('galeri-foto')
      .list('uploads', {
        limit: itemsPerPage * currentPage,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) throw error

    if (!files.length) {
      showEmptyState()
      return
    }

    // Dapatkan URL publik untuk setiap gambar
    const images = files.map(file => {
      const { data: urlData } = supabase
        .storage
        .from('galeri-foto')
        .getPublicUrl(`uploads/${file.name}`)

      return {
        url: urlData.publicUrl,
        name: file.name,
        created_at: file.created_at,
        category: categories[Math.floor(Math.random() * categories.length)],
        title: `Foto ${Math.floor(Math.random() * 1000) + 1}`,
        id: file.id
      }
    })

    currentImages = sortImages(images, currentSort)
    renderGallery(currentImages)
    
    // Sembunyikan tombol "Load More" jika tidak ada lebih banyak gambar
    loadMoreBtn.style.display = files.length < itemsPerPage * currentPage ? 'none' : 'block'

  } catch (error) {
    console.error('Error:', error)
    gallery.innerHTML = `
      <div class="empty-state animate__animated animate__fadeIn">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Gagal memuat gambar</h3>
        <p>${error.message}</p>
      </div>
    `
  }
}

// Fungsi untuk merender gallery
function renderGallery(images) {
  if (!images.length) {
    showEmptyState()
    return
  }

  gallery.innerHTML = ''

  // Filter gambar berdasarkan kategori aktif
  const filteredImages = currentFilter === 'all' 
    ? images 
    : currentFilter === 'favorites'
      ? images.filter(img => favorites.includes(img.id))
      : images.filter(img => img.category === currentFilter)

  // Filter berdasarkan pencarian jika ada
  const searchTerm = searchInput.value.toLowerCase()
  const searchedImages = searchTerm 
    ? filteredImages.filter(img => 
        img.title.toLowerCase().includes(searchTerm) || 
        img.category.toLowerCase().includes(searchTerm))
    : filteredImages

  if (!searchedImages.length) {
    showEmptyState(currentFilter === 'favorites' 
      ? 'Belum ada foto favorit' 
      : 'Tidak ada hasil pencarian')
    return
  }

  searchedImages.forEach((img, index) => {
    const photoCard = document.createElement('div')
    photoCard.className = `photo-card animate__animated animate__fadeIn`
    photoCard.style.animationDelay = `${index * 0.05}s`
    photoCard.setAttribute('data-category', img.category)
    photoCard.setAttribute('data-id', img.id)

    // Tambahkan class favorite jika ada di daftar favorit
    if (favorites.includes(img.id)) {
      photoCard.classList.add('favorite')
    }

    photoCard.innerHTML = `
      <div class="photo-img-container">
        <img src="${img.url}" alt="${img.title}" class="photo-img" loading="lazy">
        <button class="favorite-btn ${favorites.includes(img.id) ? 'active' : ''}" data-id="${img.id}">
          <i class="${favorites.includes(img.id) ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
      <div class="photo-info">
        <h3 class="photo-title">${img.title}</h3>
        <div class="photo-meta">
          <span class="photo-date">${formatDate(img.created_at)}</span>
          <span class="photo-category">${img.category}</span>
        </div>
      </div>
    `

    gallery.appendChild(photoCard)

    // Tambahkan event listener untuk membuka modal
    photoCard.addEventListener('click', (e) => {
      if (!e.target.closest('.favorite-btn')) {
        openModal(index, searchedImages)
      }
    })
  })

  // Inisialisasi Masonry jika view mode masonry
  if (viewMode === 'masonry') {
    initMasonry()
  }

  // Tambahkan event listener untuk tombol favorit
  document.querySelectorAll('.photo-card .favorite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      toggleFavorite(btn.dataset.id)
      btn.innerHTML = `<i class="${btn.classList.contains('active') ? 'far' : 'fas'} fa-heart"></i>`
      btn.classList.toggle('active')
    })
  })
}

// Fungsi untuk inisialisasi Masonry layout
function initMasonry() {
  if (masonry) {
    masonry.destroy()
  }

  masonry = new Masonry(gallery, {
    itemSelector: '.photo-card',
    columnWidth: '.photo-card',
    gutter: 15,
    fitWidth: true,
    transitionDuration: '0.3s'
  })

  // Layout ulang setelah gambar dimuat
  const images = gallery.querySelectorAll('.photo-img')
  images.forEach(img => {
    img.addEventListener('load', () => {
      masonry.layout()
    })
  })
}

// Fungsi untuk menampilkan empty state
function showEmptyState(message = 'Belum ada foto di galeri') {
  gallery.innerHTML = `
    <div class="empty-state animate__animated animate__fadeIn">
      <i class="fas fa-camera-retro"></i>
      <h3>${message}</h3>
      <p>${message === 'Belum ada foto di galeri' ? 'Mulailah dengan mengunggah foto pertama Anda' : ''}</p>
    </div>
  `
}

// Fungsi untuk membuka modal
function openModal(index, images) {
  const img = images[index]
  currentIndex = index

  modalImg.src = img.url
  modalCaption.textContent = img.title
  modal.classList.add('show')

  // Update tombol navigasi
  prevBtn.style.display = index === 0 ? 'none' : 'block'
  nextBtn.style.display = index === images.length - 1 ? 'none' : 'block'

  // Update tombol favorite
  favoriteBtn.dataset.id = img.id
  favoriteBtn.innerHTML = `<i class="${favorites.includes(img.id) ? 'fas' : 'far'} fa-heart"></i>`
  favoriteBtn.classList.toggle('active', favorites.includes(img.id))
}

// Fungsi untuk menutup modal
function closeModalFunc() {
  modal.classList.remove('show')
}

// Fungsi untuk mengunggah gambar
async function uploadFiles(files) {
  if (!files.length) return

  progressContainer.style.display = 'block'
  progressBar.style.width = '0%'
  progressText.textContent = '0%'
  uploadCount.textContent = `0 dari ${files.length} foto terunggah`

  let successCount = 0

  for (const [index, file] of Array.from(files).entries()) {
    try {
      // Validasi file
      if (!file.type.startsWith('image/')) {
        console.warn(`File ${file.name} bukan gambar, dilewati`)
        continue
      }

      if (file.size > 5 * 1024 * 1024) {
        console.warn(`File ${file.name} terlalu besar (maks 5MB), dilewati`)
        continue
      }

      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const filePath = `uploads/${fileName}`

      const { error } = await supabase
        .storage
        .from('galeri-foto')
        .upload(filePath, file)

      if (error) throw error

      successCount++

      // Update progress
      const progress = Math.round(((index + 1) / files.length) * 100)
      progressBar.style.width = `${progress}%`
      progressText.textContent = `${progress}%`
      uploadCount.textContent = `${index + 1} dari ${files.length} foto terunggah`

    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error)
    }
  }

  // Reset setelah upload selesai
  setTimeout(() => {
    progressBar.style.width = '0%'
    progressContainer.style.display = 'none'
    fileInput.value = ''

    if (successCount > 0) {
      showToast(`${successCount} foto berhasil diunggah!`)
      currentPage = 1
      displayImages()
    }
  }, 1000)
}

// Fungsi untuk toggle favorite
function toggleFavorite(imageId) {
  const index = favorites.indexOf(imageId)
  if (index === -1) {
    favorites.push(imageId)
  } else {
    favorites.splice(index, 1)
  }
  localStorage.setItem('favorites', JSON.stringify(favorites))

  // Jika sedang melihat favorit, update tampilan
  if (currentFilter === 'favorites') {
    renderGallery(currentImages)
  }
}

// Fungsi untuk mengurutkan gambar
function sortImages(images, sortBy) {
  switch (sortBy) {
    case 'newest':
      return [...images].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    case 'oldest':
      return [...images].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    case 'name-asc':
      return [...images].sort((a, b) => a.title.localeCompare(b.title))
    case 'name-desc':
      return [...images].sort((a, b) => b.title.localeCompare(a.title))
    default:
      return images
  }
}

// Fungsi untuk memformat tanggal
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Fungsi untuk menampilkan toast notifikasi
function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'toast animate__animated animate__fadeInUp'
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.remove('animate__fadeInUp')
    toast.classList.add('animate__fadeOutDown')
    setTimeout(() => toast.remove(), 500)
  }, 3000)
}

// Event Listeners

// Upload gambar
uploadBtn.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', (e) => uploadFiles(e.target.files))

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.classList.add('drag-over')
})

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over')
})

dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('drag-over')
  uploadFiles(e.dataTransfer.files)
})

// Filter kategori
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentFilter = btn.dataset.filter
    renderGallery(currentImages)
  })
})

// Modal
closeModal.addEventListener('click', closeModalFunc)
window.addEventListener('click', (e) => {
  if (e.target === modal) closeModalFunc()
})

// Navigasi modal
prevBtn.addEventListener('click', () => {
  openModal(currentIndex - 1, currentImages)
})

nextBtn.addEventListener('click', () => {
  openModal(currentIndex + 1, currentImages)
})

// Tombol aksi modal
favoriteBtn.addEventListener('click', () => {
  toggleFavorite(favoriteBtn.dataset.id)
  favoriteBtn.innerHTML = `<i class="${favorites.includes(favoriteBtn.dataset.id) ? 'fas' : 'far'} fa-heart"></i>`
  favoriteBtn.classList.toggle('active')
})

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a')
  link.href = modalImg.src
  link.download = `foto-${Date.now()}.jpg`
  link.click()
})

shareBtn.addEventListener('click', async () => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Bagikan Foto',
        text: modalCaption.textContent,
        url: modalImg.src
      })
    } else {
      // Fallback untuk browser yang tidak mendukung Web Share API
      const shareUrl = `${window.location.origin}?share=${encodeURIComponent(modalImg.src)}`
      await navigator.clipboard.writeText(shareUrl)
      showToast('Link foto disalin ke clipboard!')
    }
  } catch (error) {
    console.error('Error sharing:', error)
  }
})

// Pencarian
searchInput.addEventListener('input', () => {
  renderGallery(currentImages)
})

// Pengurutan
sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value
  currentImages = sortImages(currentImages, currentSort)
  renderGallery(currentImages)
})

// View mode
viewBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    viewBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    viewMode = btn.dataset.view
    gallery.className = 'gallery'
    gallery.classList.add(`${viewMode}-view`)
    
    if (viewMode === 'masonry') {
      initMasonry()
    }
    
    renderGallery(currentImages)
  })
})

// Load more
loadMoreBtn.addEventListener('click', () => {
  currentPage++
  displayImages()
})

// Toggle tema
themeSwitch.addEventListener('change', () => {
  document.body.setAttribute('data-theme', themeSwitch.checked ? 'dark' : 'light')
  localStorage.setItem('theme', themeSwitch.checked ? 'dark' : 'light')
})

// Inisialisasi tema dari localStorage
const savedTheme = localStorage.getItem('theme') || 'light'
document.body.setAttribute('data-theme', savedTheme)
themeSwitch.checked = savedTheme === 'dark'

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!modal.classList.contains('show')) return

  if (e.key === 'Escape') {
    closeModalFunc()
  } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
    openModal(currentIndex - 1, currentImages)
  } else if (e.key === 'ArrowRight' && currentIndex < currentImages.length - 1) {
    openModal(currentIndex + 1, currentImages)
  }
})

// Saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  // Set view mode default
  gallery.classList.add('grid-view')
  displayImages()
})