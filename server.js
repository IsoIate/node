const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override')
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
require('dotenv').config()

app.use(express.urlencoded({extended: true}))
app.use('/public', express.static('public'))
app.use(methodOverride('_method'))
app.set('view engine', 'ejs');
app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/shop', require('./routes/shop.js'));
app.use('/board', require('./routes/board.js'));

let multer = require('multer');
var storage = multer.diskStorage({  /* diskStorage - 하드에 저장, memoryStorage - 램에 저장 */

    /* 저장할 경로 */
    destination : function(req, file, cb){
        cb(null, './public/image')
    },
    /* 파일 이름 결정, originalname : 원본이름*/
    filename : function(req, file, cb){
        cb(null, file.originalname )
    }

});

var path = require('path');

var upload = multer({
    storage : storage,
    fileFilter : function (req, file, callback) {
        var ext = path.extname(file.originalname);  /* 파일 경로, 이름, 확장자 알아낼 때 사용 */
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('PNG, JPG만 업로드하세요'))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 * 1024
    }
});

var db;
MongoClient.connect(process.env.DB_URL,
    { useUnifiedTopology: true },function(error, client) {
    if(error) return console.log(error);
    db = client.db('todoapp');

    app.listen(process.env.PORT, function () {
        console.log('listening  on 8080')
    });
})



app.get('/', function (요청, 응답) {
    응답.render('index.ejs');
});

app.get('/pet', function (요청, 응답) {
    응답.send('펫 용품 쇼핑 사이트');
});

app.get('/beauty', function (요청, 응답) {
    응답.send('뷰티 용품 쇼핑 사이트');
});

app.get('/write', function (요청, 응답) {
    응답.render('write.ejs');
})

app.post('/add', function (req, res ) {
    /*console.log(req.body);
    res.send('전송완료');*/
    db.collection('counter').findOne({ name : '게시물갯수' }, function (에러, 결과) {
        if(에러) return console.log(에러);
        console.log("결과 : " + 결과.totalPost);

        var totalPosts = 결과.totalPost;

        db.collection('post').insertOne({ _id : totalPosts + 1, 제목 : req.body.title, 날짜 : req.body.date },
            function (에러, 완료) {
            if(에러) return console.log(에러);

            db.collection('counter').updateOne({ name : '게시물갯수' }, {$inc : { totalPost : 1 }}, function (에러, 결과) {
                if(에러) return console.log(에러);
                res.redirect('/list')
            })
        })

    });
});

app.get('/list', function (req, res) {
    db.collection('post').find().toArray(function (에러, 결과) {
        if(에러) return console.log(에러);
        console.log(결과);
        res.render('list.ejs', { posts : 결과 });
    });

});

app.delete('/delete', function (요청, 응답) {
    console.log(요청.body);
    요청.body._id = parseInt(요청.body._id);
    db.collection('post').deleteOne(요청.body, function (에러, 결과) {
        console.log('삭제완료');
        응답.status(200).send({ message : "삭제 성공" });
    })

});

app.get('/detail/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id : parseInt(요청.params.id) }, function (에러, 결과) {
        console.log(결과);
        응답.render('detail.ejs', { data : 결과 })  /* data라는 이름으로 결과를 detail에 보냄 */
    })
})

app.get('/edit/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id : parseInt(요청.params.id)}, function (에러, 결과) {
        응답.render('edit.ejs', { post : 결과 });
    })
})

app.put('/edit', function (요청, 응답) {
    /* id가 url에 적힌 id와 같은 게시물을 찾음 */
    db.collection('post').updateOne({ _id : parseInt(요청.body.id) },
        { $set : { 제목 : 요청.body.title, 날짜 : 요청.body.date }}, function (에러, 결과) {
        console.log("id : " + parseInt(요청.body.id));
        console.log("title : " + 요청.body.title + ", data : " + 요청.body.date);
        if(에러) console.log(에러);
        console.log("수정완료");
        응답.redirect('/list');
    });
});

app.get('/login', function (요청, 응답) {
    응답.render('login.ejs');
})

app.post('/login',
    passport.authenticate('local', { faulureRedirect : '/fail'}),
    function (요청, 응답) {
    응답.redirect('/')
})

/* id와 비번이 맞는지 DB와 비교 */
passport.use(new LocalStrategy({    /* 설정 */
    usernameField: 'id',    /* form으로 제출한 아이디의 name 값 */
    passwordField: 'pw',    /* form으로 제출한 비밀번호의 name 값 */
    session: true,          /* 세션을 생성하는가? (나중에 또 로그인시 필요) */
    passReqToCallback: false,   /* 아이디/비밀번호 외의 다른 정보검사가 필요한가? */
}, function (입력한아이디, 입력한비번, done) { /* 아이디/비번 검사 코드 */
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
        if (에러) return done(에러)

        /* DB에 아이디가 없을 떄 */
        if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
        /* DB에 아이디가 존재할 떄, 입력한비번과 결과.pw 비교 */
        if (입력한비번 == 결과.pw) {
            return done(null, 결과)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));

/* 유저의 id를 바탕으로 세션데이터를 생성, 세션데이터의 id를 쿠키로 만들어서 사용자의 브라우저로 보냄 */
passport.serializeUser(function (user, done) {
    done(null, user.id)
});

passport.deserializeUser(function (아이디, done) {
    db.collection('login').findOne({ id : 아이디}, function (에러, 결과) {
        console.log("des")
        console.log(결과);
        done(null, 결과)
    })
});

/* 로그인했니 미들웨어 추가 */
/* 실행순서 : mypage 접속 -> 로그인했니 함수 실행 -> mypage.ejs 응답 */
app.get('/mypage', 로그인했니, function (요청, 응답) {
    응답.render('mypage.ejs', { 사용자 : 요청.user })
})

function 로그인했니(요청, 응답, next) {
    if( 요청.user ) { /* 요청.user가 있으면 next()로 통과 */
        next()
    } else {    /* 없으면 에러메세지를 응답.send() */
        응답.send('로그인 안함')
    }
}

app.get('/logout', function (요청, 응답) {
    요청.logout();
    응답.redirect('/')
})

app.get('/signup', function (요청, 응답) {
    응답.render('signup.ejs')
})

app.post('/signup', function (요청, 응답) {
    db.collection('login').findOne({ id : 요청.body.id }, function (에러, 결과) {
        if(결과 != null) {
            응답.send("중복된 아이디입니다.")
        } else {
            db.collection('login').insertOne({ id : 요청.body.id, pw : 요청.body.pw }, function (에러, 결과) {
                if(에러) console.log(에러)
                else {
                    console.log('회원가입 완료')
                    응답.redirect('/')
                }
            })
        }
    })
})

app.get('/upload', function (요청, 응답) {
    응답.render('upload.ejs')
})

app.post('/upload', upload.single('프로필'), function (요청, 응답) {
    응답.send('업로드완료')
})