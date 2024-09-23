"use client";

import { fabric } from "fabric";
import LeftSidebar from "@/components/LeftSidebar";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import RightSideBar from "@/components/RightSideBar";
import { useEffect, useRef, useState } from "react";
import {
  handleCanvaseMouseMove,
  handleCanvasMouseDown,
  handleCanvasMouseUp,
  handleCanvasObjectModified,
  handleResize,
  initializeFabric,
  renderCanvas,
} from "@/lib/canvas";
import { ActiveElement } from "@/types/type";
import { useMutation, useRedo, useStorage, useUndo } from "@liveblocks/react";
import { defaultNavElement } from "@/constants";
import { handleDelete, handleKeyDown } from "@/lib/key-events";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null) as React.MutableRefObject<fabric.Canvas | null>;

  const isDrawing = useRef(false);  
  const shapeRef = useRef<fabric.Object | null>(null);
  const selectedShapeRef = useRef<string | null>(null);
  const activeObjectRef = useRef<fabric.Object | null>(null);

  const undo = useUndo();
  const redo = useRedo();
  

  

  const canvasObjects = useStorage((root) => root.canvasObjects);

  const syncShapeInStorage = useMutation( ({ storage }, object) => {
    if (!object) {
      return;
    }
    const { objectId } = object;

    const shapeData = object.toJSON();
    shapeData.objectId = objectId;

    const canvasObjects =  storage.get("canvasObjects");


    canvasObjects.set(objectId, shapeData);

  }, [canvasObjects]);

 
  

  const [activeElement, setActiveElement] = useState<ActiveElement>({
    name: "",
    value: "",
    icon: "",
  });

  const deleteAllShapes = useMutation(({storage})=>{

    const canvasObjects = storage.get('canvasObjects')

    if(!canvasObjects || canvasObjects.size === 0) return true 
    for (const [key,value] of canvasObjects.entries()){
      canvasObjects.delete(key)
    }
    canvasObjects.size === 0;
  },[])

  const deleteShapeFromStorage = useMutation(({storage} , objectId)=>{
    const canvasObjects = storage.get("canvasObjects")
    canvasObjects.delete(objectId)
  },[])

  const handleActiveElement = (elem: ActiveElement) => {
    setActiveElement(elem);

    switch(elem?.value){
      case 'reset':
        deleteAllShapes()
        fabricRef.current?.clear();
        setActiveElement(defaultNavElement)
        break
      case 'delete':
        handleDelete(fabricRef.current as any, deleteShapeFromStorage)
        setActiveElement(defaultNavElement)
      default:
        break;
    }


    selectedShapeRef.current = elem?.value as string;
  };

  useEffect(() => {
    const canvas = initializeFabric({ canvasRef, fabricRef });
    if (canvas) {
      canvas.on("mouse:down", (options: any) => {
        handleCanvasMouseDown({
          options,
          canvas,
          isDrawing,
          shapeRef,
          selectedShapeRef,
        });
      });

      canvas.on("mouse:move", (options: any) => {
        handleCanvaseMouseMove({
          options,
          canvas,
          isDrawing,
          shapeRef,
          selectedShapeRef,
          syncShapeInStorage,
        });
      });

      canvas.on("mouse:up", (options: any) => {
        handleCanvasMouseUp({
          canvas,
          isDrawing,
          shapeRef,
          selectedShapeRef,
          syncShapeInStorage,
          setActiveElement,
          activeObjectRef,
        });
      });

      canvas.on("object:modified", (options)=>{
        handleCanvasObjectModified({
          options,
          syncShapeInStorage
        })
      })
    }

      

    window.addEventListener("resize", () => {
      handleResize({ canvas });
    });

    window.addEventListener("keydown",(e)=>{
      handleKeyDown({
        e,
        canvas,
        undo,
        redo,
        syncShapeInStorage,
        deleteShapeFromStorage
      })

    })


  }, []);

  useEffect(() => {
      renderCanvas({
        fabricRef,
        canvasObjects,
        activeObjectRef,
      });
  }, [canvasObjects]);

  return (
    <main className="h-screen overflow-hidden ">
      <Navbar
        activeElement={activeElement}
        handleActiveElement={handleActiveElement}
      />
      <section className="flex h-full flex-row">
        <LeftSidebar allShapes={Array.from(canvasObjects || [])} />
        <Live canvasRef={canvasRef} />
        <RightSideBar />
      </section>
    </main>
  );
}
