/**
 * รองรับการเขียน JSX.Element แบบเดิม หลังอัปเป็น React 19
 *
 * *** ทำไมต้องมีไฟล์นี้ ***
 * React 18 มี namespace ชื่อ JSX เป็นตัวแปรกลาง (global) ให้ใช้ได้ทุกไฟล์
 * เขียน  function Foo(): JSX.Element  ได้เลย ไม่ต้อง import อะไร
 *
 * พอขึ้น React 19 ทีมงานย้าย namespace นี้ไปไว้ใต้ React กลายเป็น React.JSX
 * ตัวกลางถูกเอาออก ทำให้ทุกไฟล์ที่เขียน JSX.Element ขึ้น error ว่า
 *   "Cannot find namespace 'JSX'"
 *
 * ไฟล์นี้ประกาศ JSX กลับเข้าไปเป็นตัวกลางอีกครั้ง โดยชี้ไปที่ React.JSX ของจริง
 * จึงไม่ได้สร้าง type ใหม่ขึ้นมาเอง แค่ตั้งชื่อย่อให้เท่านั้น
 *
 * ผลคือโค้ดทั้ง 46 ไฟล์ที่เขียน JSX.Element ไว้ ใช้งานได้เหมือนเดิมทุกประการ
 * ไม่ต้องไล่แก้ทีละไฟล์ และไม่ต้อง import React เพิ่มในไฟล์ที่ไม่ได้ใช้
 */
import type * as React from 'react';

declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}
