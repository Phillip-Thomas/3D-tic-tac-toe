import React, { Suspense, useEffect, useRef, useState } from 'react';
import { BlendFunction } from 'postprocessing';
import { useImmer } from 'use-immer';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Center, Text } from '@react-three/drei';
import { DoubleSide, Mesh, Vector3 } from 'three';
import classNames from 'classnames';
import XBlock from './components/XBlock';
import OBlock from './components/OBlock';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import createGrid from './utils/createGrid';
import checkWin from './utils/checkWin';
import getGridItemKey from './utils/getGridItemKey';
import { BLOCK_DISTANCE } from './utils/constants';
import Grid from './components/Grid';
import BoardItem from './components/BoardItem';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion-3d';
import { ReactComponent as BurgerMenu } from './components/svgs/burger-menu.svg';
import { ReactComponent as CloseMenu } from './components/svgs/close.svg';

const CustomOrbitControls: React.FC<{
    winner: string | null;
    turn: string;
    onReset: () => void;
}> = ({ winner, turn, onReset }) => {
    const { camera } = useThree();
    const textRef = useRef<Mesh>(null);
    const buttonRef = useRef<Mesh>(null);
    const buttonTextRef = useRef<Mesh>(null);
    const [hover, setHover] = useState(false);

    useEffect(() => {
        document.body.style.cursor = hover ? 'pointer' : 'default';
    }, [hover]);

    useFrame(() => {
        // Make it so that these objects always face the camera
        [textRef, buttonRef, buttonTextRef].forEach((ref) => {
            ref.current?.quaternion.copy(camera.quaternion);
        });
    });

    return (
        <>
            <Text
                ref={textRef}
                color={'#bdfff0'}
                scale={[3, 3, 3]}
                position={[9, 28, 9]}
                anchorX="center">
                {winner ? 'Winner: ' + winner : 'Turn: ' + turn}
            </Text>
            {winner && (
                <motion.group
                    position={[9, 24, 9]}
                    onClick={onReset}
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}>
                    <mesh ref={buttonRef}>
                        <planeGeometry args={[10, 3]} />
                        <meshBasicMaterial color="white" side={DoubleSide} />
                    </mesh>
                    <Text ref={buttonTextRef} scale={[1.5, 1.5, 1.5]} color="black">
                        Play Again
                    </Text>
                </motion.group>
            )}
            <OrbitControls
                target={[0, 0, 0]}
                maxPolarAngle={3}
                autoRotate
                autoRotateSpeed={3}
                camera={camera}
            />
        </>
    );
};

function App() {
    const [grid, setGrid] = useImmer(() => createGrid());
    const [turn, setTurn] = useState('X');
    const [winner, setWinner] = useState<null | string>(null);
    const [expanded, setExpanded] = useState(true);
    const [hoveringCell, setHoveringCell] = useState<null | number[]>(null);

    const onClick = (i: number, j: number, k: number) => {
        if (winner) return;
        setGrid((draft) => {
            if (grid[i][j][k] !== 0) return;
            draft[i][j][k] = turn;
            if (checkWin(turn, grid, new Vector3(i, j, k))) {
                setWinner(turn);
            }
            setTurn(turn === 'X' ? 'O' : 'X');
        });
    };

    const onReset = () => {
        setGrid(() => createGrid());
        setTurn(winner === 'X' ? 'O' : 'X');
        setWinner(null);
    };

    return (
        <Suspense
            fallback={
                <div style={{ width: '100%', height: '100%', color: 'var(--backgound-color)' }}>
                    Loading...
                </div>
            }>
            <div className="Container">
                <Canvas shadows className="CanvasContainer" camera={{ position: [-30, -3, 0] }}>
                    {/* Game stuff */}
                    <Center>
                        <CustomOrbitControls turn={turn} winner={winner} onReset={onReset} />
                        <Grid />
                        <AnimatePresence>
                            <ThreeDBoard
                                grid={grid}
                                turn={turn}
                                winner={winner}
                                hoveringCell={hoveringCell}
                            />
                        </AnimatePresence>
                    </Center>

                    {/* Environment stuff */}
                    <color args={['rgb(6,22,38)']} attach="background" />
                    <ambientLight intensity={0.2} />
                    <pointLight position={[50, 200, 50]} intensity={0.75} />
                    <pointLight position={[-70, -200, 0]} intensity={0.35} />
                    <EffectComposer multisampling={8}>
                        <Bloom
                            blendFunction={BlendFunction.ADD}
                            intensity={0.4} // The bloom intensity.
                            width={300} // render width
                            height={300} // render height
                            kernelSize={5} // blur kernel size
                            luminanceThreshold={0.2} // luminance threshold. Raise this value to mask out darker elements in the scene.
                            luminanceSmoothing={0.025} // smoothness of the luminance threshold. Range is [0, 1]
                        />
                        <Bloom
                            kernelSize={KernelSize.HUGE}
                            width={500} // render width
                            height={500} // render height
                            luminanceThreshold={0}
                            luminanceSmoothing={0}
                            intensity={0.1}
                        />
                    </EffectComposer>
                </Canvas>
                <button
                    className={classNames('ExpandButton', { expanded })}
                    onClick={() => setExpanded(!expanded)}>
                    {expanded ? <CloseMenu /> : <BurgerMenu />}
                </button>
                <div className={classNames('BoardContainer', { expanded })}>
                    <div className="BoardGrid">
                        <TwoDBoard
                            grid={grid}
                            turn={turn}
                            winner={winner}
                            onClick={onClick}
                            hoveringCell={hoveringCell}
                            setHoveringCell={setHoveringCell}
                        />
                    </div>
                </div>
            </div>
        </Suspense>
    );
}

function ThreeDBoard({
    grid,
    turn,
    winner,
    hoveringCell
}: {
    grid: any[][][];
    turn: string;
    winner: null | string;
    hoveringCell: null | number[];
}) {
    return (
        <>
            {grid.map((plane, i) =>
                plane.map((row, j) =>
                    row.map((item, k) => {
                        const isEmpty = item === 0;
                        // Dont render empty cells if there is a winner
                        if (isEmpty && winner) return;

                        const key = getGridItemKey(i, j, k);
                        const isHovering =
                            i === hoveringCell?.[0] &&
                            j === hoveringCell?.[1] &&
                            k === hoveringCell?.[2];

                        // Dont render empty cells if they are not being hovered
                        if (isEmpty && !isHovering) return;

                        const blockState = isEmpty ? turn : item;

                        // Render empty cells if they are being hovered
                        const Block = blockState === 'X' ? XBlock : OBlock;
                        return (
                            <Block
                                opacity={isEmpty ? 0.5 : 1}
                                position={[
                                    i * BLOCK_DISTANCE,
                                    j * BLOCK_DISTANCE,
                                    k * BLOCK_DISTANCE
                                ]}
                                key={key}
                            />
                        );
                    })
                )
            )}
        </>
    );
}

function TwoDBoard({
    grid,
    turn,
    winner,
    hoveringCell,
    setHoveringCell,
    onClick
}: {
    grid: any[][][];
    turn: string;
    winner: null | string;
    hoveringCell: null | number[];
    setHoveringCell: (cell: null | number[]) => void;
    onClick: (i: number, j: number, k: number) => void;
}) {
    return (
        <>
            {grid.map((plane, i) => (
                <div className="BoardPlane" key={i}>
                    {plane.map((row, j) => (
                        <React.Fragment key={j}>
                            {row.map((item, k) => {
                                const isHovering =
                                    i === hoveringCell?.[0] &&
                                    j === hoveringCell?.[1] &&
                                    k === hoveringCell?.[2];

                                let itemType = null;
                                let opacity = 1;

                                if (item === 0 && isHovering) {
                                    itemType = turn;
                                    opacity = 0.3;
                                }

                                if (item !== 0) {
                                    itemType = item;
                                }

                                if (winner) {
                                    itemType = null;
                                }

                                return (
                                    <button
                                        onMouseEnter={() => setHoveringCell([i, j, k])}
                                        onMouseLeave={() => setHoveringCell(null)}
                                        className="BoardCell"
                                        key={getGridItemKey(i, j, k)}
                                        onClick={() => onClick(i, j, k)}>
                                        {itemType && (
                                            <BoardItem itemType={itemType} opacity={opacity} />
                                        )}
                                    </button>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            ))}
        </>
    );
}

export default App;
