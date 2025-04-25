import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'Draggable',
  schema: {
    camera: ecs.eid,
    distanceToCamera: ecs.f32,
    followSpeed: ecs.f32,
  },
  schemaDefaults: {
    distanceToCamera: 1,
    followSpeed: 50,
  },
  data: {
    touchPositionX: ecs.f32,
    touchPositionY: ecs.f32,
    dragging: ecs.boolean,
  },

  add: (world, component) => {
    const {eid, dataAttribute} = component

    component.data.touchPositionX = 0.5
    component.data.touchPositionY = 0.5
    component.data.dragging = false
    // Get mass data for later caching

    const HandleTouchStart = (event) => {
      const data = dataAttribute.cursor(eid)
      data.touchPositionX = event.data.position.x
      data.touchPositionY = event.data.position.y
      data.dragging = true
    }

    const HandleTouchMove = (event) => {
      const data = dataAttribute.cursor(eid)
      data.touchPositionX = event.data.position.x
      data.touchPositionY = event.data.position.y
    }

    const HandleTouchEnd = () => {
      const data = dataAttribute.cursor(eid)
      data.dragging = false
    }

    world.events.addListener(eid, ecs.input.SCREEN_TOUCH_START, HandleTouchStart)
    world.events.addListener(eid, ecs.input.SCREEN_TOUCH_MOVE, HandleTouchMove)
    world.events.addListener(eid, ecs.input.SCREEN_TOUCH_END, HandleTouchEnd)
  },

  tick: (world, component) => {
    const {eid, schemaAttribute, dataAttribute} = component
    const schema = schemaAttribute.cursor(eid)
    const data = dataAttribute.cursor(eid)

    if (!data.dragging) return

    const {camera, distanceToCamera, followSpeed} = schema

    const cameraPos = ecs.Position.get(world, camera)
    const cameraRot = ecs.Quaternion.get(world, camera)

    // Dirección hacia adelante (forward) desde la rotación de la cámara
    const forward = {
      x: 2 * (cameraRot.x * cameraRot.z + cameraRot.w * cameraRot.y),
      y: 2 * (cameraRot.y * cameraRot.z - cameraRot.w * cameraRot.x),
      z: 1 - 2 * (cameraRot.x * cameraRot.x + cameraRot.y * cameraRot.y),
    }

    // Dirección hacia la derecha (right) desde la rotación de la cámara
    const right = {
      x: 1 - 2 * (cameraRot.y * cameraRot.y + cameraRot.z * cameraRot.z),
      y: 2 * (cameraRot.x * cameraRot.y + cameraRot.w * cameraRot.z),
      z: 2 * (cameraRot.x * cameraRot.z - cameraRot.w * cameraRot.y),
    }

    // Dirección hacia arriba (up)
    const up = {
      x: 2 * (cameraRot.x * cameraRot.y - cameraRot.w * cameraRot.z),
      y: 1 - 2 * (cameraRot.x * cameraRot.x + cameraRot.z * cameraRot.z),
      z: 2 * (cameraRot.y * cameraRot.z + cameraRot.w * cameraRot.x),
    }

    // Normalizamos el desplazamiento desde el centro de pantalla
    const offsetX = (data.touchPositionX - 0.5) * 2 * (distanceToCamera / 1.4)
    const offsetY = (0.5 - data.touchPositionY) * 2 * (distanceToCamera / 1.4)

    // Calculamos la posición deseada combinando: frente + desplazamiento lateral y vertical
    // Invertimos el eje X (horizontal) para que el gesto sea natural
    const target = {
      x: cameraPos.x + forward.x * distanceToCamera + right.x * -offsetX + up.x * offsetY,
      y: cameraPos.y + forward.y * distanceToCamera + right.y * -offsetX + up.y * offsetY,
      z: cameraPos.z + forward.z * distanceToCamera + right.z * -offsetX + up.z * offsetY,
    }

    const current = ecs.Position.get(world, eid)
    const smoothed = {
      x: current.x + (target.x - current.x) * (followSpeed / 100),
      y: current.y + (target.y - current.y) * (followSpeed / 100),
      z: current.z + (target.z - current.z) * (followSpeed / 100),
    }

    world.setPosition(eid, smoothed.x, smoothed.y, smoothed.z)
  },
})
