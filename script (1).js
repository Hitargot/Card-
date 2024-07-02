// Canvas
const canvas = document.querySelector('canvas.webgl')

const folderPath = './static/starwars/';
const textureNames = [
'1.png', 
'2.png', 
'3.png'

]; 

let scene, camera, renderer, composer, renderPass, planeMaterial, mesh, controls, loadedModel;
let overlaystength = 0.12;
const textures = [];

// Load textures and store in an array
const loadTextures = async () => {
    const textureLoader = new THREE.TextureLoader();

    try {
        // Load all textures
        const loadedTextures = await Promise.all(textureNames.map(textureName => textureLoader.loadAsync(folderPath + textureName)));

        // Store loaded textures
        loadedTextures.forEach(texture => textures.push(texture));

        const imageWidth = textures[0].image.width;
        const imageHeight = textures[0].image.height;
        const imageAspect = imageWidth / imageHeight;

        // Initialize shader material with the first texture
        planeMaterial = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: {
                texture1: { value: textures[0] },
                texture2: { value: textures[1] },                
                mixFactor: { value: 0 },
                step1: { value: 0 },
                step2: { value: 0 },
                emissionColor: { value: new THREE.Color(0x768ce1) },
                overlayStrength: { value: overlaystength }
            },
            vertexShader: `  
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDirection;
        
            void main()
            {
                vUv = uv;
                vNormal = normal;

                vec4 mPosition = modelMatrix * vec4(position, 1.0);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;

                vViewDirection = -normalize(cameraPosition - mPosition.xyz);
        
            }`,
            fragmentShader: `
            
            uniform sampler2D texture1;  
            uniform sampler2D texture2;    
            uniform float mixFactor;
            uniform float step1;
            uniform float step2;
            uniform vec3 emissionColor;  // Add this line
            uniform float overlayStrength;  // Add this line
        
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDirection;
        
            void main()
            {
              vec3 texture1 = texture2D(texture1, vUv).rgb;
              vec3 texture2 = texture2D(texture2, vUv).rgb;

              vec3 mixedColor = mix(texture1, texture2, smoothstep(step1, step2, mixFactor));
              vec3 finalColor = mix(mixedColor, emissionColor * 3.0, overlayStrength); 

              // Determine backside based on the normal vector
              float backside = step(0.0, dot(normalize(vNormal), normalize(vViewDirection))); 

              // Set color based on side
              vec3 cardColor = mix(finalColor, vec3(1.0), backside);

              gl_FragColor = vec4(cardColor, 1.0);
            }`
        });

        // Create a plane geometry and mesh for card
        const width = 3;
        const height = 3 / imageAspect;
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(width, height, 1, 1),
          planeMaterial
        )
        card.position.z = 0.085;
        
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x393b3a,
            metalness: 0.4, 
            roughness: 0.8            
        }); 
      
        const blueMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3182c3,
            metalness: 0.4, 
            roughness: 0.8   
        }); 
        const screwMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x6e7375,
            metalness: 0.9, 
            roughness: 0.4,
            side: THREE.DoubleSide
        }); 
        const WhiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xc5c7c4,
            metalness: 0.4, 
            roughness: 0.8   
        }); 
        

        //load 3d model for card frame
        // Load the GLTF model
        const loader = new THREE.GLTFLoader();
        let modelpath = '';
        if(imageAspect == 1.0)
            modelpath = './static/frame/14x14.glb';
        else
            modelpath = './static/frame/18x24.glb';
        loader.load(modelpath, function (gltf) {
            const model = gltf.scene;
            loadedModel = model;
            let scale = 0.0;
            if(imageAspect == 1.0)
                scale = 0.4;
            else
                scale = 0.35;
            let scaleZ = 1.;

            if(imageAspect == 1.0){        
                model.rotateY(-Math.PI / 2);                
            }else if(imageAspect < 1.0){
                model.rotateY(-Math.PI / 2);                   
                scale *= 3.0/4.0;                
            }else{
                model.rotateY(-Math.PI / 2);    
                model.rotateX(-Math.PI / 2);                   
                scale *= 3.0/4.0 * 3.0/4.0;      
            }
            model.scale.set(scale, scale, scale);  
            
            // Compute the bounding box
            const box = new THREE.Box3().setFromObject(model);

            // Compute the center of the bounding box
            const center = box.getCenter(new THREE.Vector3());

            // Reposition the model so that its center is at the origin
            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= center.z;
                    
            
            let BoltsParent = null;            
            model.traverse((node) => {
                if (node.name === 'Bolts' && node.type === 'Object3D') {
                    BoltsParent = node;
                }
                if (node.name === 'MainPlate' && node.isMesh) {                        
                    node.material = frameMaterial;
                }
                if (node.name === 'BackWhite' && node.isMesh) {                        
                    node.material = WhiteMaterial;
                }
                if (node.name === 'FrontWhite' && node.isMesh) {                        
                    node.material = WhiteMaterial;
                }
                if (node.name === 'BtnWhite' && node.isMesh) {                        
                    node.material = WhiteMaterial;
                }
                if (node.name === 'BtnBlack' && node.isMesh) {                        
                    node.material = frameMaterial;
                }
                if (node.name === 'BlueBox' && node.isMesh) {                        
                    node.material = blueMaterial;
                }
            });            
            if (BoltsParent) {                
                BoltsParent.traverse((node) => {
                    if (node.isMesh) {                        
                        node.material = screwMaterial;
                    }
                });
            }            
            
            if(imageAspect == 1.0)
                model.position.set(0, 0, -0.015);
            else if(imageAspect <= 1.0)
                model.position.set(0.19, -0.25, -0.03);
            else
                model.position.set(-0.19, -0.15, 0.0);

            scene.add(model);
            
        }, undefined, function (error) {
            console.error(error);
        });

        scene.add(card);
        //scene.add(cardFrame);

    } catch (error) {
        console.error('Error loading textures:', error);
    }
};

// Initialize Three.js
const init = () => {
  // Create scene
  scene = new THREE.Scene();

  // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5); 
    directionalLight1.position.set(5, 3, 5);
    directionalLight1.rotation.set(0, 0, 0);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5); 
    directionalLight2.position.set(-5, 3, -5);  
    directionalLight2.rotation.set(0, 0, 0);  
    
    scene.add(directionalLight1);
    scene.add(directionalLight2);

  const sizes = {
    width: canvas.clientWidth,
    height: canvas.clientHeight
  }
  
  camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
  camera.position.x = 0
  camera.position.y = 0
  camera.position.z = 5
  scene.add(camera)


  renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(window.devicePixelRatio)

  controls = new THREE.OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enableZoom = true

  // Post-processing setup
    composer = new THREE.EffectComposer(renderer);
    renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.0,  // strength
        1.0,  // radius
        0.85  // threshold
    );
    composer.addPass(bloomPass);

  // Load textures and create atlas
  loadTextures().then(() => {
      // Only start animation loop after textures are loaded
      tick();
  });

  // Resize handling
  window.addEventListener('resize', () =>
  {
      // Update sizes
      sizes.width = canvas.clientWidth
      sizes.height = canvas.clientHeight

      // Update camera
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()

      // Update renderer
      renderer.setSize(sizes.width, sizes.height)
      renderer.setPixelRatio(window.devicePixelRatio)
  })

  // Button event listeners
  const overlayOffButton = document.getElementById('Unframed');
  const overlayOnButton = document.getElementById('Framed');

  overlayOffButton.addEventListener('click', () => {
      if (planeMaterial) {
          planeMaterial.uniforms.overlayStrength.value = 0;
      }
      if (loadedModel) {
        loadedModel.visible = false;
      }    
  });

  overlayOnButton.addEventListener('click', () => {
      if (planeMaterial) {
          planeMaterial.uniforms.overlayStrength.value = overlaystength;
      }
      if (loadedModel) {
        loadedModel.visible = true;
      }    
  });

};


//const clock = new THREE.Clock()
const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

const tick = () =>
{
   //const elapsedTime = clock.getElapsedTime()

   // Update material
   if(planeMaterial) {
       let angle = controls.getAzimuthalAngle() / (Math.PI / 2);
       let mixfactor = (angle * 0.5 + 0.5) * textures.length;
       let index = Math.floor(mixfactor);
       planeMaterial.uniforms.texture1.value = textures[clamp(index, 0, textures.length - 1)];
       planeMaterial.uniforms.texture2.value = textures[clamp(index + 1, 0, textures.length - 1)];
       planeMaterial.uniforms.mixFactor.value = mixfactor;

       let step = index + 0.5;
       planeMaterial.uniforms.step1.value = step;
       planeMaterial.uniforms.step2.value = step + 1.0;
   }

   // Update controls
   controls.update()

   // Render
   renderer.render(scene, camera)
   //composer.render();

   // Call tick again on the next frame
   window.requestAnimationFrame(tick)
}

init();
